import structlog
from typing import Dict, Any, Tuple

log = structlog.get_logger()

class PolicyEngine:
    def __init__(self):
        # In a real system, these would be configurable rules in DB
        self.protected_assets = ["EMR_Server", "SCADA_Server", "PLC_Controller"]
        self.dangerous_actions = ["block_ip", "isolate_host", "shutdown_host"]
        
    async def evaluate_action(self, action_name: str, params: Dict[str, Any], context: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Evaluates whether an action is allowed to run based on RBAC, Asset Policy, and Approvals.
        Returns (is_allowed, reason).
        """
        log.info("policy_engine.evaluating", action=action_name)
        
        # 1. Check if action is dangerous
        if action_name in self.dangerous_actions:
            
            # 2. Check asset criticality
            asset_type = context.get("asset", {}).get("device_type", "")
            if asset_type in self.protected_assets:
                # 3. Check for approval
                is_approved = context.get("approval_status") == "approved"
                if not is_approved:
                    log.warning("policy_engine.blocked_unapproved_dangerous_action", action=action_name, asset=asset_type)
                    return False, f"Action '{action_name}' on protected asset '{asset_type}' requires explicit approval."
                    
        return True, "Action permitted by policy."

policy_engine = PolicyEngine()
