import structlog
from typing import Dict, Any
from app.soar.connectors.base import BaseConnector

log = structlog.get_logger()

class LocalMockFirewallConnector(BaseConnector):
    def __init__(self):
        super().__init__(name="LocalMockFirewall")
        
    async def execute_action(self, action_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        log.info(f"firewall_connector.executing", action=action_name, params=params)
        
        if action_name == "block_ip":
            ip = params.get("ip")
            if not ip:
                return {"status": "failed", "error": "Missing IP parameter"}
            
            # Simulate a successful firewall block
            log.info("firewall_connector.ip_blocked", ip=ip)
            return {"status": "success", "message": f"IP {ip} successfully blocked on Mock Firewall."}
            
        elif action_name == "unblock_ip":
            ip = params.get("ip")
            if not ip:
                return {"status": "failed", "error": "Missing IP parameter"}
                
            log.info("firewall_connector.ip_unblocked", ip=ip)
            return {"status": "success", "message": f"IP {ip} successfully unblocked on Mock Firewall."}
            
        return {"status": "failed", "error": f"Unsupported action: {action_name}"}
