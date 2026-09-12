import structlog
import uuid
import asyncio
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import Playbook, PlaybookExecution
from app.soar.policy import policy_engine
from app.soar.connectors.local_mock_firewall import LocalMockFirewallConnector

log = structlog.get_logger()

# Pre-registered Python functions for the MVP Sandbox
def calculate_risk(context: Dict[str, Any], params: Dict[str, Any]) -> Dict[str, Any]:
    # Dummy calculation
    asset_crit = context.get("asset", {}).get("criticality", "low")
    score = 80 if asset_crit in ["high", "critical"] else 20
    return {"risk_score": score, "critical": score >= 80}

REGISTERED_PYTHON_FUNCTIONS = {
    "calculate_risk": calculate_risk
}

class PlaybookEngine:
    async def execute_playbook(self, session: AsyncSession, playbook: Playbook, trigger_entity_type: str, trigger_entity_id: str, tenant_id: int):
        exec_id = str(uuid.uuid4())
        execution = PlaybookExecution(
            id=exec_id,
            playbook_id=playbook.id,
            status="running",
            trigger_entity_type=trigger_entity_type,
            trigger_entity_id=trigger_entity_id,
            tenant_id=tenant_id
        )
        session.add(execution)
        await session.commit()
        
        # Hydrate context stub (In reality, fetch the actual alert/incident data)
        context = {
            "trigger_type": trigger_entity_type,
            "trigger_id": trigger_entity_id,
            "approval_status": "pending",
            "asset": {"criticality": "high", "device_type": "EMR_Server"}, # Mock for demo
            "variables": {}
        }
        
        asyncio.create_task(self._execute_workflow(exec_id, playbook.definition, context))
        return exec_id

    async def _execute_workflow(self, execution_id: str, definition: Dict[str, Any], context: Dict[str, Any]):
        log.info("playbook_engine.workflow_started", execution_id=execution_id)
        results = []
        try:
            steps = definition.get("nodes", definition.get("steps", []))
            
            # Simple sequential runner that also understands nested blocks (like ForEach)
            # In a full DAG, this would traverse edges. For MVP, we iterate an ordered list of nodes.
            for node in steps:
                node_result = await self._execute_node(node, context)
                results.append({"node": node.get("id", node.get("name", "Unknown")), "result": node_result})
                
                # Update variables in context if node outputs something
                if "outputs" in node_result:
                    node_id = node.get("id", "last_node")
                    context["variables"][node_id] = node_result["outputs"]
                
                if node_result.get("status") == "failed" and node.get("on_failure") == "abort":
                    log.warning("playbook_engine.aborted", execution_id=execution_id, failed_node=node.get("id"))
                    break
                    
                if node_result.get("status") == "paused":
                    # E.g. waiting for approval
                    log.info("playbook_engine.paused", execution_id=execution_id)
                    await self._update_execution_status(execution_id, "paused", results)
                    return # Exit background task, state is paused
                    
            await self._update_execution_status(execution_id, "completed", results)
            log.info("playbook_engine.workflow_completed", execution_id=execution_id)
        except Exception as e:
            log.error("playbook_engine.workflow_failed", execution_id=execution_id, error=str(e))
            await self._update_execution_status(execution_id, "failed", results)
            
    async def _execute_node(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        node_type = node.get("type", "action")
        params = node.get("params", {})
        
        log.info("playbook_engine.executing_node", type=node_type, id=node.get("id"))
        
        if node_type == "condition":
            return self._evaluate_condition(params, context)
        elif node_type == "python":
            return self._execute_python(params, context)
        elif node_type == "foreach":
            return await self._execute_foreach(node, context)
        elif node_type == "while":
            return await self._execute_while(node, context)
        elif node_type == "approval":
            # For MVP, we just pause or check context
            if context.get("approval_status") == "approved":
                return {"status": "success", "message": "Approval granted"}
            else:
                return {"status": "paused", "message": "Waiting for manual approval"}
        elif node_type == "yara":
            return {"status": "success", "outputs": {"match": False, "rules": []}, "message": "YARA scan mocked"}
        elif node_type == "action":
            action_name = node.get("action")
            return await self._execute_action(action_name, params, context)
        else:
            return {"status": "failed", "error": f"Unknown node type: {node_type}"}

    def _evaluate_condition(self, params: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        # Simple evaluation MVP
        # params: {"variable": "variables.calc.critical", "operator": "==", "value": True}
        var_path = params.get("variable", "")
        # Very simple variable resolution (MVP)
        val = None
        if var_path.startswith("variables."):
            parts = var_path.split(".")
            if len(parts) == 3:
                val = context.get("variables", {}).get(parts[1], {}).get(parts[2])
                
        expected = params.get("value")
        op = params.get("operator", "==")
        
        result = False
        if op == "==":
            result = (val == expected)
        elif op == ">":
            result = (val > expected if val is not None else False)
            
        if result:
            return {"status": "success", "message": "Condition matched"}
        else:
            return {"status": "failed", "message": "Condition false", "on_failure": "continue"}

    def _execute_python(self, params: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        code_id = params.get("code_id")
        if not code_id or code_id not in REGISTERED_PYTHON_FUNCTIONS:
            return {"status": "failed", "error": f"Unregistered python code_id: {code_id}"}
            
        func = REGISTERED_PYTHON_FUNCTIONS[code_id]
        try:
            res = func(context, params)
            return {"status": "success", "outputs": res}
        except Exception as e:
            return {"status": "failed", "error": str(e)}

    async def _execute_foreach(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        # Expects 'items' (list or var path) and 'body' (list of nodes)
        items_path = node.get("params", {}).get("items", [])
        # For MVP, assume it's just a raw list passed in params
        items = items_path if isinstance(items_path, list) else []
        body_nodes = node.get("body", [])
        
        loop_results = []
        for item in items:
            # Create sub-context for the loop
            sub_context = context.copy()
            sub_context["variables"] = context["variables"].copy()
            sub_context["variables"]["loop_item"] = item
            
            iteration_res = []
            for b_node in body_nodes:
                r = await self._execute_node(b_node, sub_context)
                iteration_res.append(r)
                if r.get("status") == "failed" and b_node.get("on_failure") == "abort":
                    break
            loop_results.append(iteration_res)
            
        return {"status": "success", "outputs": {"iterations": len(items)}}

    async def _execute_while(self, node: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        # Stub for While loop implementation
        return {"status": "success", "message": "While loop executed"}

    async def _execute_action(self, action: str, params: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        # Policy Engine Evaluation
        is_allowed, reason = await policy_engine.evaluate_action(action, params, context)
        if not is_allowed:
            return {"status": "failed", "error": f"Policy rejection: {reason}"}
            
        if action == "virustotal_lookup":
            ip = params.get("ip", "unknown")
            return {"status": "success", "outputs": {"malicious": ip == "1.1.1.1"}}
        elif action in ["block_ip", "unblock_ip"]:
            connector = LocalMockFirewallConnector()
            return await connector.execute_action(action, params)
        elif action == "notify_slack":
            return {"status": "success", "message": "Notification sent"}
        else:
            return {"status": "failed", "error": f"Unknown action: {action}"}

    async def _update_execution_status(self, execution_id: str, status: str, results: list):
        from app.services.detection_service import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            from sqlalchemy.future import select
            stmt = select(PlaybookExecution).where(PlaybookExecution.id == execution_id)
            result = await session.execute(stmt)
            execution = result.scalar_one_or_none()
            if execution:
                execution.status = status
                execution.results = results
                if status in ["completed", "failed"]:
                    execution.completed_at = datetime.utcnow()
                await session.commit()
                
playbook_engine = PlaybookEngine()
