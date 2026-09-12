import asyncio
import httpx
import json
from datetime import datetime, timezone

async def run_demo():
    # 1. Trigger the exfiltration log
    print("--- 1. Injecting Synthetic Healthcare Exfiltration Log ---")
    log_event = {
        "@timestamp": datetime.now(timezone.utc).isoformat(),
        "event": {
            "category": "network",
            "type": "connection",
            "action": "netflow",
            "outcome": "success"
        },
        "asset": {
            "sector": "healthcare",
            "criticality": "high",
            "device_type": "EMR_Server"
        },
        "source": {
            "ip": "10.10.10.50"
        },
        "destination": {
            "ip": "203.0.113.77",
            "port": 443
        },
        "network": {
            "transport": "tcp",
            "bytes": 1610612736  # 1.5 GB
        }
    }
    
    async with httpx.AsyncClient() as client:
        # Ingest the log
        res = await client.post("http://localhost:8000/api/ingest/events", json=[log_event])
        print("Ingest Response:", res.status_code, res.json())
        
        # Wait for detection engine to run (assume it runs every 10-60s)
        # For the demo script, we'll wait a bit or trigger it manually if we had a manual trigger.
        print("Log indexed. Detection engine will process it shortly.")
        
        # 2. Upload the demo Playbook
        print("\n--- 2. Registering E2E Demo Playbook ---")
        playbook_def = {
            "name": "E2E Healthcare Exfiltration Containment",
            "nodes": [
                {
                    "id": "calc_risk",
                    "type": "python",
                    "params": {"code_id": "calculate_risk"}
                },
                {
                    "id": "check_risk",
                    "type": "condition",
                    "params": {
                        "variable": "variables.calc_risk.critical",
                        "operator": "==",
                        "value": True
                    }
                },
                {
                    "id": "require_approval",
                    "type": "approval"
                },
                {
                    "id": "contain_host",
                    "type": "action",
                    "action": "block_ip",
                    "params": {"ip": "10.10.10.50"}
                }
            ]
        }
        
        pb_res = await client.post("http://localhost:8000/api/playbooks", json=playbook_def)
        pb_data = pb_res.json()
        print("Playbook Registered:", pb_data)
        
        if pb_data.get("status") == "success":
            pb_id = pb_data["id"]
            
            # 3. Test Playbook Execution (Simulating what happens when Alert triggers it)
            print(f"\n--- 3. Triggering Playbook {pb_id} ---")
            exec_res = await client.post(f"http://localhost:8000/api/playbooks/{pb_id}/test", json={"alert_id": "mock_alert_123"})
            print("Execution Triggered:", exec_res.json())

if __name__ == "__main__":
    asyncio.run(run_demo())
