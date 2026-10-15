import structlog
import uuid
import time
import random
from datetime import datetime
from app.websocket.server import manager
from app.detection.rules import load_all_rules
from app.repositories.alert_repository import alert_repo
from app.services.asset_service import asset_service
from app.services.correlation_service import correlation_service
from app.services.threat_intel_service import threat_intel_service
from app.detection.correlation_engine import correlation_engine
from app.detection.schemas import EngineAction, RuleCorrelationConfig
import datetime as dt

log = structlog.get_logger()

def build_correlation_config(rule: dict) -> RuleCorrelationConfig:
    """Parse the `correlation:` block from a rule's YAML into typed config."""
    corr = rule.get("correlation", {}) or {}
    return RuleCorrelationConfig(
        rule_id=rule["id"],
        correlate_by=tuple(corr.get("correlate_by", ["source_ip"])),
        correlation_window_secs=corr.get("correlation_window_secs", 300),
        suppression_secs=corr.get("suppression_secs", 900),
        escalate_after=corr.get("escalate_after", 50),
        max_samples=corr.get("max_samples", 25),
        exact_dedup_window_secs=corr.get("exact_dedup_window_secs", 2.0),
        threshold=corr.get("threshold", 1),
    )


class DetectionEngine:
    def __init__(self):
        self.rules = load_all_rules()

    def reload_rules(self):
        """Reloads the YAML rules from disk without restarting the application."""
        self.rules = load_all_rules()
        log.info("detection_engine_rules_reloaded", rule_count=len(self.rules))

    async def process_log(self, event: dict):
        """
        Evaluates a normalized event against the ruleset.
        Supports structured matching, thresholds, and asset enrichment.
        """
        for rule in self.rules:
            if self._is_match(rule, event):
                await self._handle_match(rule, event)
                # We continue to check other rules (no break) to allow multi-rule hits

    async def process_batch(self, events: list):
        """
        Processes a batch of events sequentially through the engine.
        """
        for event in events:
            try:
                await self.process_log(event)
            except Exception as e:
                log.error("detection_batch_event_failed", error=str(e), event_id=event.get("id"))
    
    def _is_match(self, rule: dict, event: dict) -> bool:
        """Determines if the event matches the rule logic."""
        
        # 1. Exact Field Match
        if "match" in rule:
            for field, value in rule["match"].items():
                if str(event.get(field, "")).lower() != value.lower():
                    return False
        
        # 2. Field Contains (substring)
        if "contains" in rule:
            # We check raw_log fields or top-level fields
            for field, patterns in rule["contains"].items():
                field_val = str(event.get(field) or event.get("raw_log", {}).get(field, "")).lower()
                if not any(p.lower() in field_val for p in patterns):
                    return False
        
        # 3. Regex Match on Raw String
        if "regex" in rule:
            raw_str = str(event.get("raw_log", "")).lower()
            if not rule["regex"].search(raw_str):
                return False
                
        return True

    async def _handle_match(self, rule: dict, event: dict):
        """Handles a matched rule, calling correlation engine and processing new/escalated alerts."""
        
        cfg = build_correlation_config(rule)

        async def _publish(bucket, action):
            # Asset Enrichment
            source_ip = event.get("source_ip")
            asset = asset_service.get_asset_by_ip(source_ip)
            
            alert_id = bucket.alert_id
            
            # Timestamp standardisation
            now_utc = dt.datetime.now(dt.timezone.utc).isoformat()
            occurred_at = (
                event.get("timestamp")
                or event.get("@timestamp")
                or now_utc
            )
            ingested_at = now_utc
            
            # Build enriched alert
            alert = {
                "type": "alert",
                "alert_id": alert_id,
                "title": rule.get("name", rule.get("title", rule["id"])),
                "severity": bucket.severity,
                "source_ip": source_ip,
                "mitre_tactic": rule.get("tactic", rule.get("mitre_tactic", "N/A")),
                "mitre_technique": rule.get("mitre_technique", "N/A"),
                "timestamp": occurred_at, # backward compatibility
                "occurred_at": occurred_at,
                "ingested_at": ingested_at,
                "rule_id": bucket.rule_id,
                "occurrence_count": bucket.occurrence_count,
                "suppressed_count": bucket.suppressed_count,
                "action": action.value,
                "is_escalation": action == EngineAction.ESCALATED,
                "raw_event": event,
                "source_event_id": event.get("event_id")
            }

            # Threat Intel Enrichment
            intel = threat_intel_service.enrich_ip(source_ip)
            alert["threat_intel"] = intel
            if intel.get("is_malicious") and alert["severity"] == "LOW":
                alert["severity"] = "MEDIUM"

            # ── Detection Confidence Engine ──
            confidence_score = 40 # Base confidence for signature match
            
            # IP Reputation Signal (+20)
            if intel.get("is_malicious"):
                confidence_score += 20
                
            # Asset Criticality Signal (+15)
            if asset and asset.get("criticality") == "HIGH":
                confidence_score += 15
            elif asset and asset.get("criticality") == "CRITICAL":
                confidence_score += 25
                
            # Repeating Pattern Signal (+10)
            # (This would normally check DB history, but for MVP we use a small random boost for variety)
            if random.random() > 0.7:
                confidence_score += 10
                
            alert["confidence_score"] = min(100, confidence_score)

            # Enrichment payload
            if asset:
                alert["asset_context"] = {
                    "hostname": asset.get("hostname"),
                    "criticality": asset.get("criticality"),
                    "asset_type": asset.get("asset_type"),
                    "owner": asset.get("owner"),
                    "department": asset.get("department")
                }
                # Adjust severity based on asset criticality
                if asset.get("criticality") == "High" and alert["severity"] != "CRITICAL":
                    alert["severity"] = "HIGH"
                if asset.get("criticality") == "Critical":
                    alert["severity"] = "CRITICAL"

            # Deduplication key
            dedup_key = f"{rule['id']}-{source_ip}"
            alert["dedup_key"] = dedup_key
            alert["raw_payload"] = event

            # Persist
            try:
                db_alert_id = alert_repo.process_alert(alert)
                
                # Correlate into campaigns only for NEW alerts
                if action == EngineAction.NEW_ALERT:
                    correlation_service.process_alert(db_alert_id, alert)
                    
                    # Process via Risk Engine to group into incidents
                    from app.services.incident_service import incident_service
                    incident_service.process_alert(db_alert_id, alert)
                
                # Real-time WebSocket Broadcast
                manager.broadcast_sync({
                    "type": "alert",
                    "data": { **alert, "id": db_alert_id }
                })
            except Exception as e:
                log.error("alert_persistence_failed", error=str(e))
            
            # Broadcast
            await manager.broadcast(alert)

        await correlation_engine.process(cfg, event, publish_cb=_publish)

detection_engine = DetectionEngine()
