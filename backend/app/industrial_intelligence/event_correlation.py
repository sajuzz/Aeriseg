"""
IT/OT Cross-Zone Event Correlation Engine
------------------------------------------
Correlates security telemetry spanning Enterprise IT, Engineering, and
Operational Technology (OT) segments into unified, evidence-backed incidents.

Key Principles:
1. Relationships must be supported by verifiable fields (source/dest IPs,
   processes, timestamps, asset IDs).
2. Missing fields are never invented.
3. Out-of-order and late-arriving events within the correlation window are
   chronologically re-ordered.
4. Duplicate events are collapsed to prevent incident spam.
5. Cross-zone pivots (e.g. IT/Eng -> OT) are explicitly detected and scored.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import hashlib
import uuid
import structlog

from app.industrial_intelligence.schemas import (
    CorrelatedIncident,
    SecuritySeverity,
    PurdueLevel,
)
from app.industrial_intelligence.asset_registry import asset_registry, IndustrialAssetRegistry
from app.industrial_intelligence.impact_scoring import impact_scorer, ManufacturingImpactScorer

log = structlog.get_logger()


def _parse_timestamp(ts: Any) -> datetime:
    """Parses various timestamp formats into UTC datetime."""
    if isinstance(ts, datetime):
        return ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
    if isinstance(ts, (int, float)):
        return datetime.fromtimestamp(ts, tz=timezone.utc)
    if isinstance(ts, str):
        try:
            return datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except ValueError:
            pass
    return datetime.now(timezone.utc)


def _event_fingerprint(event: Dict[str, Any]) -> str:
    """Computes SHA-256 hash of core content fields to drop exact duplicates."""
    core = (
        str(event.get("source_ip", "")),
        str(event.get("dest_ip", "")),
        str(event.get("rule_id", "")),
        str(event.get("event_type", "")),
        str(event.get("command_line", event.get("process_name", ""))),
    )
    return hashlib.sha256(":".join(core).encode("utf-8")).hexdigest()


class IndustrialEventCorrelationEngine:
    def __init__(
        self,
        registry: Optional[IndustrialAssetRegistry] = None,
        scorer: Optional[ManufacturingImpactScorer] = None,
        correlation_window_secs: float = 300.0,
    ):
        self.registry = registry or asset_registry
        self.scorer = scorer or impact_scorer
        self.window_secs = correlation_window_secs
        
        # Active incident buckets keyed by correlation group key
        # key format: "chain:<source_ip>" or "pivot:<src_ip>-><dest_ip>"
        self._incidents: Dict[str, CorrelatedIncident] = {}
        self._seen_event_fingerprints: Dict[str, float] = {}  # fingerprint -> timestamp

    def _is_duplicate_event(self, event: Dict[str, Any], event_ts: datetime) -> bool:
        """Returns True if the exact byte/field content was processed recently."""
        fp = _event_fingerprint(event)
        now_epoch = event_ts.timestamp()
        if fp in self._seen_event_fingerprints:
            last_epoch = self._seen_event_fingerprints[fp]
            if abs(now_epoch - last_epoch) <= 5.0:  # 5-second exact duplicate window
                return True
        self._seen_event_fingerprints[fp] = now_epoch
        return False

    def _find_active_incident(self, src_ip: str, dst_ip: str, event_time: datetime) -> Optional[CorrelatedIncident]:
        """Finds an existing active incident that this event correlates with within the time window."""
        now_ts = event_time.timestamp()

        for incident in self._incidents.values():
            inc_start = incident.created_at.timestamp()
            inc_end = incident.updated_at.timestamp()

            # Window check: event timestamp within window of incident
            if abs(now_ts - inc_end) <= self.window_secs or abs(now_ts - inc_start) <= self.window_secs:
                # Pivot chaining: matches source IP or downstream destination
                ip_matched = False
                if src_ip and (src_ip in incident.affected_assets or any(src_ip == e.get("source_ip") or src_ip == e.get("dest_ip") for e in incident.events)):
                    ip_matched = True
                if dst_ip and (dst_ip in incident.affected_assets or any(dst_ip == e.get("dest_ip") for e in incident.events)):
                    ip_matched = True

                if ip_matched:
                    return incident

        return None

    def process_event(self, event: Dict[str, Any]) -> Optional[CorrelatedIncident]:
        """
        Processes a single event or alert, correlating it into existing or new incidents.
        Returns the created/updated CorrelatedIncident.
        """
        src_ip = str(event.get("source_ip", "")).strip()
        dst_ip = str(event.get("dest_ip", "")).strip()
        rule_id = str(event.get("rule_id", "IND-RULE-GENERIC"))
        severity_str = str(event.get("severity", "MEDIUM")).lower()
        event_time = _parse_timestamp(event.get("timestamp"))

        # Drop exact byte/field duplicates
        if self._is_duplicate_event(event, event_time):
            log.info("correlation.duplicate_event_dropped", rule_id=rule_id, src=src_ip)
            return None

        # Resolve asset context from registry
        src_asset = self.registry.get_asset_by_ip(src_ip)
        dst_asset = self.registry.get_asset_by_ip(dst_ip)

        # Detect cross-zone pivot (e.g. IT/Eng to Supervisory/Control)
        is_cross_zone = False
        if src_asset and dst_asset:
            src_lvl = src_asset.purdue_level
            dst_lvl = dst_asset.purdue_level
            if src_lvl in [PurdueLevel.LEVEL_3, PurdueLevel.LEVEL_4] and dst_lvl in [PurdueLevel.LEVEL_1, PurdueLevel.LEVEL_2]:
                is_cross_zone = True

        # Map severity enum
        try:
            sec_severity = SecuritySeverity(severity_str)
        except ValueError:
            sec_severity = SecuritySeverity.MEDIUM

        # Confidence (default 65 if not specified)
        confidence = float(event.get("confidence", 65.0))

        # Check maintenance window on affected assets
        is_maint = False
        if src_asset and self.registry.is_in_maintenance(src_asset.asset_id):
            is_maint = True
        if dst_asset and self.registry.is_in_maintenance(dst_asset.asset_id):
            is_maint = True

        # Find or create correlation bucket
        existing_incident = self._find_active_incident(src_ip, dst_ip, event_time)

        if not existing_incident:
            # Create a new incident bucket
            inc_id = f"IND-INC-{uuid.uuid4().hex[:8].upper()}"

            primary_asset = dst_asset or src_asset
            primary_asset_id = primary_asset.asset_id if primary_asset else "UNKNOWN_ASSET"

            affected_asset_ids = []
            if src_asset:
                affected_asset_ids.append(src_asset.asset_id)
            if dst_asset and dst_asset.asset_id not in affected_asset_ids:
                affected_asset_ids.append(dst_asset.asset_id)

            title = f"Industrial Security Sequence: {event.get('message', event.get('rule_name', rule_id))}"
            if is_cross_zone:
                title = f"Cross-Zone Pivot Alert: {src_asset.name if src_asset else src_ip} -> {dst_asset.name if dst_asset else dst_ip}"

            # Calculate initial impact score
            score_res = self.scorer.score(
                security_severity=sec_severity,
                asset=primary_asset,
                confidence_score=confidence,
                event_data=event,
                is_corroborated=False,
                is_maintenance=is_maint,
            )

            rationale = (
                f"Initial sequence initiated from {src_ip or 'external source'} "
                f"targeting {dst_ip or 'internal segment'} with detection rule '{rule_id}'."
            )
            if is_cross_zone:
                rationale += f" Event crosses network boundaries ({src_asset.purdue_level.value} -> {dst_asset.purdue_level.value})."

            incident = CorrelatedIncident(
                incident_id=inc_id,
                title=title,
                created_at=event_time,
                updated_at=event_time,
                affected_assets=affected_asset_ids,
                primary_asset_id=primary_asset_id,
                event_count=1,
                events=[event],
                timeline=[{
                    "timestamp": event_time.isoformat(),
                    "rule_id": rule_id,
                    "summary": event.get("message", "Security telemetry match"),
                    "source_ip": src_ip,
                    "dest_ip": dst_ip,
                }],
                rules_triggered=[rule_id],
                correlation_rationale=rationale,
                cross_zone_pivot=is_cross_zone,
                impact_assessment=score_res,
                status="OPEN",
            )
            self._incidents[inc_id] = incident
            log.info("correlation.incident_created", incident_id=inc_id)
            return incident

        else:
            # Correlate into existing incident
            incident = existing_incident

            # Append event
            incident.events.append(event)
            incident.event_count += 1

            # Chronological reordering for timeline (handles out-of-order arrivals)
            new_entry = {
                "timestamp": event_time.isoformat(),
                "rule_id": rule_id,
                "summary": event.get("message", "Subsequent correlated telemetry match"),
                "source_ip": src_ip,
                "dest_ip": dst_ip,
            }
            incident.timeline.append(new_entry)
            incident.timeline.sort(key=lambda t: t["timestamp"])

            # Update timestamp bounds
            incident.updated_at = max(incident.updated_at, event_time)
            incident.created_at = min(incident.created_at, event_time)

            # Update affected assets
            for a in [src_asset, dst_asset]:
                if a and a.asset_id not in incident.affected_assets:
                    incident.affected_assets.append(a.asset_id)

            if rule_id not in incident.rules_triggered:
                incident.rules_triggered.append(rule_id)

            if is_cross_zone:
                incident.cross_zone_pivot = True

            # Re-score with multi-event corroboration bonus
            primary_asset = self.registry.get_asset(incident.primary_asset_id)
            new_score = self.scorer.score(
                security_severity=sec_severity,
                asset=primary_asset,
                confidence_score=min(100.0, confidence + 15.0),  # Corroborated confidence boost
                event_data=event,
                is_corroborated=True,
                is_maintenance=is_maint,
            )
            incident.impact_assessment = new_score

            incident.correlation_rationale = (
                f"Correlated {incident.event_count} events across {len(incident.affected_assets)} asset(s). "
                f"Rules: {', '.join(incident.rules_triggered)}. "
                f"Cross-zone OT pivot confirmed: {incident.cross_zone_pivot}."
            )
            log.info("correlation.incident_updated", incident_id=incident.incident_id, count=incident.event_count)
            return incident

    def list_incidents(self) -> List[CorrelatedIncident]:
        """Returns all active correlated industrial incidents."""
        return list(self._incidents.values())

    def get_incident(self, incident_id: str) -> Optional[CorrelatedIncident]:
        """Retrieves an incident by its ID."""
        for inc in self._incidents.values():
            if inc.incident_id == incident_id:
                return inc
        return None

    def clear(self) -> None:
        """Clears in-memory incident state (useful for tests)."""
        self._incidents.clear()
        self._seen_event_fingerprints.clear()


# Shared singleton instance
correlation_engine = IndustrialEventCorrelationEngine()
