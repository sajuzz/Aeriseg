"""
Synthetic Industrial Demonstration Scenarios Generator
-------------------------------------------------------
Deterministic, safe generator producing Scenarios A through F.
Generates simulated telemetry without executing any real malicious payloads.
"""

from typing import Dict, Any, List
from datetime import datetime, timezone, timedelta
import structlog

from app.industrial_intelligence.service import industrial_service
from app.industrial_intelligence.schemas import CorrelatedIncident

log = structlog.get_logger()


SCENARIOS_CATALOG = [
    {
        "id": "scenario_a",
        "name": "Scenario A: Benign Scheduled Maintenance",
        "category": "Maintenance Validation",
        "description": "Authorized engineering laptop performs diagnostic polling during an active maintenance window. Demonstrates maintenance window dampening and false-alarm suppression.",
    },
    {
        "id": "scenario_b",
        "name": "Scenario B: Suspicious Endpoint Scripting",
        "category": "Endpoint Anomaly",
        "description": "Engineering Workstation Alpha launches an unusual PowerShell process. Demonstrates baseline endpoint detection before lateral movement.",
    },
    {
        "id": "scenario_c",
        "name": "Scenario C: Cross-Zone IT/OT Pivot (Full Chain)",
        "category": "Lateral Movement & Control",
        "description": "Suspicious endpoint activity followed by direct S7comm connection targeting Assembly Line 1 PLC. Demonstrates multi-event corroboration, cross-zone pivot alert, and elevated manufacturing impact.",
    },
    {
        "id": "scenario_d",
        "name": "Scenario D: Repeated Authentication Failures",
        "category": "Credential Access",
        "description": "Multiple failed SSH/RDP authentication bursts against engineering host. Demonstrates evidence strength calculation and credential access tracking.",
    },
    {
        "id": "scenario_e",
        "name": "Scenario E: False-Positive Control",
        "category": "Noise Suppression",
        "description": "Unusual network probe resembling port scan but lacking process trace or payload. Demonstrates uncertainty tracking preventing false alarm escalation.",
    },
    {
        "id": "scenario_f",
        "name": "Scenario F: Comparative Asset Criticality Context",
        "category": "Asset Context Impact",
        "description": "Simulates identical suspicious command execution against an IT Workstation vs. a Critical PLC to prove that potential manufacturing impact adapts without falsifying evidence.",
    },
]


def run_scenario(scenario_id: str) -> Dict[str, Any]:
    """Executes a selected synthetic scenario and injects it into the correlation engine."""
    now = datetime.now(timezone.utc)

    if scenario_id == "scenario_a":
        # Ensure maintenance window is active on IND-ENG-02
        industrial_service.set_maintenance("IND-ENG-02", is_active=True, reason="Weekly diagnostic calibration")

        event = {
            "source_ip": "192.168.20.22",
            "dest_ip": "10.10.100.52",
            "rule_id": "IND-MAINT-CALIBRATION",
            "message": "Routine S7 diagnostic request from maintenance field laptop to safety PLC",
            "process_name": "calib_tool.exe",
            "user": "line_tech_02",
            "severity": "LOW",
            "timestamp": now.isoformat(),
            "confidence": 60.0,
        }
        inc = industrial_service.ingest_event(event)
        return {
            "scenario": "Scenario A: Benign Maintenance",
            "status": "injected",
            "incident": inc.model_dump() if inc else None,
            "highlight": "Priority score dampened due to active maintenance window on IND-ENG-02",
        }

    elif scenario_id == "scenario_b":
        event = {
            "source_ip": "192.168.20.15",
            "dest_ip": "192.168.20.15",
            "rule_id": "IND-SUSP-POWERSHELL",
            "message": "Obfuscated PowerShell script execution on Engineering Workstation Alpha",
            "process_name": "powershell.exe -enc JABzAD0ATgBlAHcALQBPAGIAagBlAGMAdAA...",
            "user": "local_engineer",
            "severity": "HIGH",
            "timestamp": now.isoformat(),
            "confidence": 75.0,
        }
        inc = industrial_service.ingest_event(event)
        return {
            "scenario": "Scenario B: Suspicious Endpoint Behavior",
            "status": "injected",
            "incident": inc.model_dump() if inc else None,
            "highlight": "Endpoint security severity elevated to HIGH; pending lateral movement correlation",
        }

    elif scenario_id == "scenario_c":
        # Event 1: Endpoint script
        e1 = {
            "source_ip": "192.168.20.15",
            "dest_ip": "192.168.20.15",
            "rule_id": "IND-SUSP-POWERSHELL",
            "message": "Obfuscated PowerShell script launched on Engineering Workstation Alpha",
            "process_name": "powershell.exe -w hidden -c ...",
            "user": "svc_automation",
            "severity": "HIGH",
            "timestamp": (now - timedelta(seconds=60)).isoformat(),
            "confidence": 80.0,
        }
        industrial_service.ingest_event(e1)

        # Event 2: Direct industrial protocol pivot to PLC
        e2 = {
            "source_ip": "192.168.20.15",
            "dest_ip": "10.10.100.51",
            "rule_id": "IND-CROSS-ZONE-S7",
            "message": "Direct S7comm PLC memory block overwrite command targeting Main Drive PLC",
            "payload_snippet": "S7COMM_JOB_WRITE_VAR [DB1.DBX0.0 = 1]",
            "severity": "CRITICAL",
            "timestamp": now.isoformat(),
            "confidence": 92.0,
        }
        inc = industrial_service.ingest_event(e2)
        return {
            "scenario": "Scenario C: Correlated IT/OT Cross-Zone Pivot",
            "status": "injected",
            "incident": inc.model_dump() if inc else None,
            "highlight": "Multi-event correlation triggered: Purdue Level 3 -> Level 1 cross-zone pivot with CRITICAL operational impact on Assembly Line 1",
        }

    elif scenario_id == "scenario_d":
        for i in range(3):
            e = {
                "source_ip": "192.168.10.45",
                "dest_ip": "192.168.20.15",
                "rule_id": "IND-AUTH-BRUTEFORCE",
                "message": f"Authentication failure sequence attempt #{i+1} against Engineering Workstation",
                "user": f"unknown_adm_{i}",
                "severity": "MEDIUM",
                "timestamp": (now - timedelta(seconds=30 - (i * 10))).isoformat(),
                "confidence": 70.0,
            }
            inc = industrial_service.ingest_event(e)

        return {
            "scenario": "Scenario D: Repeated Authentication Failures",
            "status": "injected",
            "incident": inc.model_dump() if inc else None,
            "highlight": "Correlated multiple failed authentication attempts originating from enterprise IT host",
        }

    elif scenario_id == "scenario_e":
        # Ambiguous probe lacking process or payload evidence
        event = {
            "source_ip": "192.168.20.99",
            "dest_ip": "10.10.100.10",
            "rule_id": "IND-PORT-SCAN-PROBE",
            "message": "Anomalous TCP SYN packet burst targeting SCADA port 502",
            "severity": "LOW",
            "timestamp": now.isoformat(),
            "confidence": 40.0,
        }
        inc = industrial_service.ingest_event(event)
        return {
            "scenario": "Scenario E: False-Positive Control",
            "status": "injected",
            "incident": inc.model_dump() if inc else None,
            "highlight": "Uncertainty factors populated; low confidence prevents unwarranted production shutdown recommendations",
        }

    elif scenario_id == "scenario_f":
        # Compare assessment of identical event on IT PC vs PLC
        res_it = industrial_service.assess_event(
            security_severity="HIGH",
            asset_id="IND-IT-01",
            confidence=75.0,
            event_data={"process_name": "mimikatz.exe", "source_ip": "192.168.10.45"},
        )
        res_plc = industrial_service.assess_event(
            security_severity="HIGH",
            asset_id="IND-PLC-101",
            confidence=75.0,
            event_data={"process_name": "mimikatz.exe", "source_ip": "10.10.100.51"},
        )
        return {
            "scenario": "Scenario F: Comparative Criticality Context",
            "status": "computed",
            "comparison": {
                "it_workstation": res_it.model_dump(),
                "plc_controller": res_plc.model_dump(),
            },
            "highlight": f"Identical detection yielded {res_it.potential_manufacturing_impact_score}/100 impact on IT PC vs {res_plc.potential_manufacturing_impact_score}/100 impact on Assembly Drive PLC.",
        }

    else:
        raise ValueError(f"Unknown scenario ID '{scenario_id}'")
