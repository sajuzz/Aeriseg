from .base import BaseParser
from app.models.schema import CommonEventSchema
from datetime import datetime

class LinuxParser(BaseParser):
    def parse(self, raw_data: dict, event_type: str = "telemetry") -> CommonEventSchema:
        """
        Parses Linux Agent logs (e.g., auth.log).
        """
        severity = "info"
        if "failed" in str(raw_data.get("message", "")).lower() or event_type == "failed_auth":
            severity = "medium"

        ts = raw_data.get("timestamp")
        if not ts:
            ts = datetime.utcnow().isoformat() + "Z"

        agent_id = raw_data.get("agent_id")
        metadata = {}
        if agent_id:
            metadata["agent_id"] = agent_id

        return CommonEventSchema(
            timestamp=ts,
            source="linux_agent",
            event_type=raw_data.get("event_type", event_type),
            source_ip=raw_data.get("source_ip", "127.0.0.1"),
            dest_ip=raw_data.get("dest_ip"),
            username=raw_data.get("user"),
            hostname=raw_data.get("hostname"),
            severity=severity,
            raw_log=raw_data,
            metadata=metadata
        )
