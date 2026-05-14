import asyncio
import random
from datetime import datetime
import structlog
from app.detection.engine import detection_engine
from app.websocket.server import manager
from app.repositories.telemetry_repository import telemetry_repo



log = structlog.get_logger()

MOCK_EVENTS = [
    {"source_ip": "10.0.0.52", "message": "Normal web traffic to external host"},
    {"source_ip": "192.168.1.100", "message": "Failed SSH login attempt"},
    {"source_ip": "192.168.1.100", "message": "Multiple failed SSH logins detected"},
    {"source_ip": "10.0.5.10", "message": "Unexpected SMB Traffic cross-vlan"},
    {"source_ip": "10.0.0.88", "message": "Suspicious PowerShell download executed"},
    {"source_ip": "10.20.5.5", "message": "Routine health check from monitoring system"},
    {"source_ip": "10.0.1.200", "message": "Ransomware beacon calling home to known C2"}
]

async def telemetry_loop():
    log.info("Starting mock telemetry generator...")
    while True:
        event = random.choice(MOCK_EVENTS).copy()
        event["timestamp"] = datetime.utcnow().isoformat()
        
        # Broadcast raw telemetry to websocket
        await manager.broadcast({"type": "telemetry", "data": event})
        
        # Persist to SQLite
        telemetry_repo.insert({
            "source": "mock",
            "event_type": "telemetry",
            "source_ip": event["source_ip"],
            "raw_log": {"message": event["message"]},
            "severity": "info",
            "timestamp": event["timestamp"]
        })
        
        # Send to detection engine
        await detection_engine.process_log(event)

        
        await asyncio.sleep(random.uniform(2.0, 5.0))
