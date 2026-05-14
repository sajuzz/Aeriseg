import random
import time
from fastapi import APIRouter, HTTPException
from app.repositories.telemetry_repository import telemetry_repo
from app.services.detection_service import detection_service
from datetime import datetime

router = APIRouter()

ATTACK_TEMPLATES = {
    "sqli": {
        "event_type": "alert",
        "src_ip": "192.168.1.105",
        "dest_ip": "10.0.5.20",
        "alert": {
            "signature": "ET EXPLOIT SQL Injection Attempt (UNION SELECT)",
            "category": "Potentially Evasive Executable",
            "severity": 1,
            "priority": 1
        }
    },
    "port_scan": {
        "event_type": "alert",
        "src_ip": "10.10.2.50",
        "dest_ip": "10.0.5.10",
        "alert": {
            "signature": "GPL SCAN Potential SSH Scan",
            "category": "Attempted Information Leak",
            "severity": 2,
            "priority": 2
        }
    },
    "brute_force": {
        "event_type": "alert",
        "src_ip": "45.33.22.11",
        "dest_ip": "10.0.5.15",
        "alert": {
            "signature": "ET SCAN SSH Brute Force Attempt",
            "category": "Attempted Login",
            "severity": 2,
            "priority": 2
        }
    }
}

@router.post("/simulator/trigger")
async def trigger_attack(attack_type: str):
    if attack_type not in ATTACK_TEMPLATES:
        raise HTTPException(status_code=400, detail="Unknown attack type")
    
    # Generate 5 events for threshold rules
    for _ in range(5):
        event = ATTACK_TEMPLATES[attack_type].copy()
        event["timestamp"] = datetime.utcnow().isoformat()
        
        # Inject into system
        from app.parsers.registry import parser_registry
        parser = parser_registry.get_parser("suricata")
        normalized = parser.parse(event)
        
        if normalized:
            telemetry_repo.insert(normalized.dict())
            detection_service.process_log(normalized.dict())
            
        time.sleep(0.1)

    return {"status": "success", "message": f"Injected 5 {attack_type} events"}
