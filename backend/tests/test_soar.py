import pytest
import asyncio
from app.soar.policy import policy_engine
from app.soar.engine import playbook_engine

@pytest.mark.asyncio
async def test_policy_normal_asset_allowed():
    # Normal asset + block_ip -> Allowed
    context = {"asset": {"device_type": "Workstation"}, "approval_status": "pending"}
    is_allowed, _ = await policy_engine.evaluate_action("block_ip", {"ip": "1.1.1.1"}, context)
    assert is_allowed == True

@pytest.mark.asyncio
async def test_policy_emr_server_blocked():
    # EMR_Server + no approval -> Blocked
    context = {"asset": {"device_type": "EMR_Server"}, "approval_status": "pending"}
    is_allowed, reason = await policy_engine.evaluate_action("block_ip", {"ip": "1.1.1.1"}, context)
    assert is_allowed == False
    assert "requires explicit approval" in reason

@pytest.mark.asyncio
async def test_policy_plc_controller_blocked():
    # PLC_Controller + no approval -> Blocked
    context = {"asset": {"device_type": "PLC_Controller"}, "approval_status": "pending"}
    is_allowed, reason = await policy_engine.evaluate_action("isolate_host", {"ip": "10.0.0.5"}, context)
    assert is_allowed == False

@pytest.mark.asyncio
async def test_policy_protected_approved_allowed():
    # Protected asset + approved context -> Connector executes
    context = {"asset": {"device_type": "EMR_Server"}, "approval_status": "approved"}
    is_allowed, _ = await policy_engine.evaluate_action("block_ip", {"ip": "1.1.1.1"}, context)
    assert is_allowed == True

@pytest.mark.asyncio
async def test_engine_unknown_code_id():
    # Unknown code_id -> Rejected
    params = {"code_id": "malicious_eval"}
    context = {}
    res = playbook_engine._execute_python(params, context)
    assert res["status"] == "failed"
    assert "Unregistered python code_id" in res["error"]

@pytest.mark.asyncio
async def test_engine_foreach_loop():
    # ForEach with 3 items -> Nested workflow executes 3 times
    node = {
        "type": "foreach",
        "params": {"items": ["ip1", "ip2", "ip3"]},
        "body": [
            {
                "type": "action",
                "action": "virustotal_lookup",
                "params": {"ip": "dummy"}
            }
        ]
    }
    context = {"variables": {}, "approval_status": "pending"}
    res = await playbook_engine._execute_foreach(node, context)
    assert res["status"] == "success"
    assert res["outputs"]["iterations"] == 3
