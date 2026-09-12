import structlog
from typing import Dict, Any

log = structlog.get_logger()

class BaseConnector:
    """
    Base class for all SOAR connectors.
    """
    def __init__(self, name: str, version: str = "1.0"):
        self.name = name
        self.version = version
        
    async def execute_action(self, action_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a specific action. Must be overridden by subclasses.
        """
        raise NotImplementedError("Connectors must implement execute_action")
