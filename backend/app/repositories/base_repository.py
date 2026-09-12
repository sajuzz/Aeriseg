from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BaseTelemetryRepository(ABC):
    @abstractmethod
    def insert(self, event_data: Dict[str, Any]) -> str:
        """Insert a telemetry event and return its ID."""
        pass
        
    @abstractmethod
    def get_by_id(self, event_id: str) -> Dict[str, Any]:
        """Fetch a telemetry event by its ID."""
        pass

class BaseAlertRepository(ABC):
    @abstractmethod
    def process_alert(self, alert_payload: Dict[str, Any]) -> int:
        """Process and persist an alert, returning its database ID."""
        pass
