from app.models.schema import IngestEvent, CommonEventSchema
from datetime import datetime

def normalize_event(event: IngestEvent) -> CommonEventSchema:
    # Very basic normalization logic based on source
    source_ip = "0.0.0.0"
    severity = "info"
    
    if event.source == "nginx":
        source_ip = event.raw_log.get("remote_addr", "Unknown")
        status = str(event.raw_log.get("status", "200"))
        if status.startswith("4") or status.startswith("5"):
            severity = "medium"
            
    elif event.source == "authlog":
        msg = event.raw_log.get("message", "")
        if "Failed password" in msg:
            severity = "high"
            # Naive IP extraction
            parts = msg.split()
            for p in parts:
                if p.count('.') == 3:
                    source_ip = p
                    break

    return CommonEventSchema(
        timestamp=datetime.utcnow().isoformat(),
        source=event.source,
        event_type=event.event_type,
        source_ip=source_ip,
        raw_log=event.raw_log,
        severity=severity
    )
