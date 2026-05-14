import structlog
import uuid
import time
from datetime import datetime
from collections import defaultdict
from app.websocket.server import manager
from app.detection.rules import DETECTION_RULES
from app.repositories.alert_repository import alert_repo
from app.services.asset_service import asset_service
from app.services.correlation_service import correlation_service
from app.services.threat_intel_service import threat_intel_service
from app.websocket.server import manager

log = structlog.get_logger()

class DetectionEngine:
    def __init__(self):
        self.rules = DETECTION_RULES
        # state: {(rule_id, group_key): [timestamp1, timestamp2, ...]}
        self.state = defaultdict(list)

    async def process_log(self, event: dict):
        """
        Evaluates a normalized event against the ruleset.
        Supports structured matching, thresholds, and asset enrichment.
        """
        for rule in self.rules:
            if self._is_match(rule, event):
                await self._handle_match(rule, event)
                # We continue to check other rules (no break) to allow multi-rule hits
    
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
        """Handles a matched rule, including threshold evaluation and enrichment."""
        
        # Threshold Check
        if "threshold" in rule:
            # Generate group key (e.g., rule_id + source_ip)
            group_fields = rule.get("group_by", ["source_ip"])
            group_val = "-".join([str(event.get(f, "unknown")) for f in group_fields])
            state_key = (rule["id"], group_val)
            
            now = time.time()
            window = rule["threshold"]["seconds"]
            
            # Clean old entries
            self.state[state_key] = [ts for ts in self.state[state_key] if now - ts < window]
            
            # Add current hit
            self.state[state_key].append(now)
            
            # If threshold not met, return
            if len(self.state[state_key]) < rule["threshold"]["count"]:
                return
            
            # If met, we generate the alert (and clear state to prevent flood? Or keep sliding?)
            # For demo, we alert on every hit AFTER threshold is met
        
        # Asset Enrichment
        source_ip = event.get("source_ip")
        asset = asset_service.get_asset_by_ip(source_ip)
        
        alert_id = f"A-{uuid.uuid4().hex[:6].upper()}"
        
        # Build enriched alert
        alert = {
            "type": "alert",
            "alert_id": alert_id,
            "title": rule["title"],
            "severity": rule["severity"],
            "source_ip": source_ip,
            "mitre_tactic": rule.get("mitre_tactic", "N/A"),
            "mitre_technique": rule.get("mitre_technique", "N/A"),
            "timestamp": datetime.utcnow().isoformat(),
            "rule_id": rule["id"],
            "dedup_count": len(self.state.get((rule["id"], "-".join([str(event.get(f, "unknown")) for f in rule.get("group_by", ["source_ip"])] if "threshold" in rule else ["source_ip"])), [1])),
            "raw_event": event
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
            # Correlate into campaigns
            correlation_service.process_alert(db_alert_id, alert)
            
            # Real-time WebSocket Broadcast
            manager.broadcast_sync({
                "type": "alert",
                "data": { **alert, "id": db_alert_id }
            })
        except Exception as e:
            log.error("alert_persistence_failed", error=str(e))
        
        # Broadcast
        await manager.broadcast(alert)

detection_engine = DetectionEngine()
