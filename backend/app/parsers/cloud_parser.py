from .base import BaseParser
from app.models.schema import CommonEventSchema
from datetime import datetime

class CloudParser(BaseParser):
    def parse(self, raw_data: dict, event_type: str = "cloud_audit") -> CommonEventSchema:
        """
        Parses Cloud-related logs (AWS/Floci).
        Maps API calls to security events.
        """
        # Determine severity based on the action
        action = raw_data.get("eventName", raw_data.get("action", "Unknown"))
        severity = "low"
        
        # High-risk actions
        critical_actions = ["DeleteBucket", "DeleteUser", "PutBucketPolicy"]
        high_actions = ["CreateAccessKey", "ListBuckets", "GetSecretValue"]
        
        if any(ca in action for ca in critical_actions):
            severity = "critical"
        elif any(ha in action for ha in high_actions):
            severity = "high"
        
        ts = raw_data.get("eventTime", raw_data.get("timestamp", datetime.utcnow().isoformat()))

        return CommonEventSchema(
            timestamp=ts,
            source="aws",
            event_type=event_type,
            source_ip=raw_data.get("sourceIPAddress", "0.0.0.0"),
            user=raw_data.get("userIdentity", {}).get("userName", "unknown"),
            rule_name=f"Cloud_{action}",
            severity=severity,
            raw_log=raw_data
        )
