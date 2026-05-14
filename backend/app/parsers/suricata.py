from .base import BaseParser
from app.models.schema import CommonEventSchema
from datetime import datetime

class SuricataParser(BaseParser):
    def parse(self, raw_data: dict, event_type: str = "telemetry") -> CommonEventSchema:
        """
        Parses Suricata EVE JSON format.
        Maps alert priorities to AeriSeg severities.
        """
        # Extract alert info if present
        alert = raw_data.get("alert", {})
        
        # Map Suricata priority (1=Highest) to AeriSeg severity
        severity = "low"
        if alert:
            priority = alert.get("priority", 3)
            if priority == 1:
                severity = "critical"
            elif priority == 2:
                severity = "high"
            elif priority == 3:
                severity = "medium"
            else:
                severity = "low"
        
        # Use EVE timestamp if available, otherwise now
        ts = raw_data.get("timestamp")
        if not ts:
            ts = datetime.utcnow().isoformat()

        return CommonEventSchema(
            timestamp=ts,
            source="suricata",
            event_type=raw_data.get("event_type", event_type),
            source_ip=raw_data.get("src_ip", "0.0.0.0"),
            dest_ip=raw_data.get("dest_ip"),
            rule_name=alert.get("signature") if alert else None,
            severity=severity,
            raw_log=raw_data
        )
