import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.asyncio
async def test_api_list_and_get_assets():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/industrial-intelligence/assets")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 9
        assert any(a["asset_id"] == "IND-PLC-101" for a in data)

        # Get specific asset
        resp_asset = await client.get("/api/industrial-intelligence/assets/IND-PLC-101")
        assert resp_asset.status_code == 200
        assert resp_asset.json()["asset_type"] == "plc_controller"

        # Not found
        resp_404 = await client.get("/api/industrial-intelligence/assets/NON-EXISTENT")
        assert resp_404.status_code == 404


@pytest.mark.asyncio
async def test_api_assess_alert():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "security_severity": "HIGH",
            "asset_id": "IND-PLC-101",
            "confidence": 80.0,
            "event_data": {
                "source_ip": "192.168.20.15",
                "dest_ip": "10.10.100.51",
                "command_line": "s7_write_block",
            }
        }
        resp = await client.post("/api/industrial-intelligence/assess-alert", json=payload)
        assert resp.status_code == 200
        body = resp.json()
        assert "priority_score" in body
        assert body["asset_criticality"] == "critical"
        assert body["potential_manufacturing_impact_score"] == 100.0


@pytest.mark.asyncio
async def test_api_event_ingest_and_incident_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        event = {
            "source_ip": "192.168.20.15",
            "dest_ip": "10.10.100.10",
            "rule_id": "IND-MODBUS-PROBE",
            "message": "Unusual Modbus register scan targeting SCADA server",
            "severity": "HIGH",
            "timestamp": "2026-10-10T16:00:00Z",
            "confidence": 85.0,
        }
        # Ingest event
        resp_ingest = await client.post("/api/industrial-intelligence/events", json=event)
        assert resp_ingest.status_code == 200
        res = resp_ingest.json()
        assert res["status"] == "success"
        inc_id = res["incident_id"]
        assert inc_id is not None

        # Get incident
        resp_inc = await client.get(f"/api/industrial-intelligence/incidents/{inc_id}")
        assert resp_inc.status_code == 200
        assert resp_inc.json()["incident_id"] == inc_id

        # Get explanation
        resp_expl = await client.get(f"/api/industrial-intelligence/incidents/{inc_id}/explanation")
        assert resp_expl.status_code == 200
        expl = resp_expl.json()
        assert "facts_observed" in expl
        assert "hypotheses_and_possibilities" in expl

        # Get recommendations
        resp_recs = await client.get(f"/api/industrial-intelligence/incidents/{inc_id}/recommendations")
        assert resp_recs.status_code == 200
        recs = resp_recs.json()
        assert len(recs) >= 2

        # Record decision
        disruptive = [r for r in recs if r["is_disruptive"]]
        if disruptive:
            rec_id = disruptive[0]["recommendation_id"]
            resp_dec = await client.post(
                f"/api/industrial-intelligence/recommendations/{rec_id}/decision",
                json={"decision": "APPROVED", "reviewer": "SOC_Supervisor", "reason": "Authorized test"},
            )
            assert resp_dec.status_code == 200
            assert resp_dec.json()["approval_status"] == "executed"


@pytest.mark.asyncio
async def test_api_scenarios_execution():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # List scenarios
        resp_list = await client.get("/api/industrial-intelligence/scenarios")
        assert resp_list.status_code == 200
        scenarios = resp_list.json()
        assert len(scenarios) == 6

        # Run Scenario A
        resp_a = await client.post("/api/industrial-intelligence/scenarios/scenario_a/run")
        assert resp_a.status_code == 200
        assert resp_a.json()["status"] == "injected"

        # Run Scenario C (Cross-zone pivot)
        resp_c = await client.post("/api/industrial-intelligence/scenarios/scenario_c/run")
        assert resp_c.status_code == 200
        assert resp_c.json()["status"] == "injected"

        # Run Scenario F (Comparative context)
        resp_f = await client.post("/api/industrial-intelligence/scenarios/scenario_f/run")
        assert resp_f.status_code == 200
        assert resp_f.json()["status"] == "computed"
        assert "comparison" in resp_f.json()
