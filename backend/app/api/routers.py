from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import datetime

router = APIRouter()

# Mock data
MOCK_ALERTS = [
    {
        "alert_id": "A-1001",
        "message": "SMB Protocol anomaly detected",
        "severity": "CRITICAL",
        "source": "suricata",
        "source_ip": "10.0.0.5",
        "rule_id": "rule-001",
        "tactic": "Lateral Movement",
        "created_at": datetime.datetime.utcnow().isoformat()
    },
    {
        "alert_id": "A-1002",
        "message": "Multiple failed SSH logins",
        "severity": "HIGH",
        "source": "zeek",
        "source_ip": "192.168.1.50",
        "rule_id": "rule-015",
        "tactic": "Credential Access",
        "created_at": (datetime.datetime.utcnow() - datetime.timedelta(minutes=15)).isoformat()
    }
]

MOCK_CASES = [
    {
        "case_id": "C-2001",
        "alert_id": "A-1001",
        "title": "[L3] SMB Protocol anomaly detected",
        "tier": "L3",
        "status": "OPEN",
        "created_at": datetime.datetime.utcnow().isoformat()
    },
    {
        "case_id": "C-2002",
        "alert_id": "A-1002",
        "title": "[L2] Multiple failed SSH logins",
        "tier": "L2",
        "status": "OPEN",
        "created_at": (datetime.datetime.utcnow() - datetime.timedelta(minutes=15)).isoformat()
    }
]

MOCK_INCIDENTS = [
    {
        "incident_id": "INC-3001",
        "case_id": "C-1999",
        "title": "Ransomware beacon detected",
        "severity": "CRITICAL",
        "status": "IN_PROGRESS",
        "owner_team": "SOC",
        "created_at": (datetime.datetime.utcnow() - datetime.timedelta(hours=2)).isoformat()
    }
]

@router.get("/alerts")
async def get_alerts():
    return MOCK_ALERTS

@router.get("/cases")
async def get_cases():
    return MOCK_CASES

@router.post("/cases/{case_id}/update")
async def update_case(case_id: str, data: dict):
    for case in MOCK_CASES:
        if case["case_id"] == case_id:
            if "tier" in data:
                case["tier"] = data["tier"]
            if "status" in data:
                case["status"] = data["status"]
            return {"status": "success", "case": case}
    return {"error": "not found"}

@router.get("/incidents")
async def get_incidents():
    return MOCK_INCIDENTS

@router.post("/incidents/{incident_id}/update")
async def update_incident(incident_id: str, data: dict):
    return {"status": "success", "incident_id": incident_id, "updated_data": data}

@router.get("/report")
async def get_report():
    return {
        "generated_at": datetime.datetime.utcnow().isoformat(),
        "summary": {
            "total_alerts": 150,
            "total_cases": 45,
            "total_incidents": 5,
            "escalations": 2,
            "sla_breaches": 0
        },
        "severity_breakdown": {
            "CRITICAL": 5,
            "HIGH": 20,
            "MEDIUM": 50,
            "LOW": 75
        },
        "sla": {
            "avg_resolution_human": "1h 15m"
        }
    }
