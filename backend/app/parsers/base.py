from abc import ABC, abstractmethod
from app.models.schema import CommonEventSchema
from datetime import datetime

class BaseParser(ABC):
    @abstractmethod
    def parse(self, raw_data: dict, event_type: str = "telemetry") -> CommonEventSchema:
        """Transform raw input into the AeriSeg Common Event Schema."""
        pass

class PlaceholderParser(BaseParser):
    def __init__(self, source_name: str):
        self.source_name = source_name

    def parse(self, raw_data: dict, event_type: str = "telemetry") -> CommonEventSchema:
        return CommonEventSchema(
            timestamp=datetime.utcnow().isoformat(),
            source=self.source_name,
            event_type=event_type,
            source_ip=raw_data.get("source_ip", "0.0.0.0"),
            severity=raw_data.get("severity", "info"),
            raw_log=raw_data
        )
