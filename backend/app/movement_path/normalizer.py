import structlog
from typing import Dict, Any, Optional

log = structlog.get_logger()

async def normalize_event(raw_event: Dict[str, Any], source_type: str) -> Optional[Dict[str, Any]]:
    """
    Normalizes a raw event based on its source type into an ECS-compatible format.
    """
    try:
        normalized = {
            "event.category": "unknown",
            "event.type": "info",
            "event.action": "unknown",
            "event.outcome": "unknown",
            "event.severity": "informational",
            "raw_event": raw_event
        }

        if source_type == "suricata":
            _normalize_suricata(raw_event, normalized)
        elif source_type == "csv":
            _normalize_csv(raw_event, normalized)
        else:
            # Generic fallback normalization
            _normalize_generic(raw_event, normalized)
            
        return normalized
    except Exception as e:
        log.error("movement_path.normalize_failed", error=str(e), source_type=source_type)
        return None

def _normalize_suricata(raw: Dict[str, Any], out: Dict[str, Any]):
    out["event.category"] = "network"
    out["event.type"] = "connection"
    
    if "timestamp" in raw:
        out["@timestamp"] = raw["timestamp"]
        
    if "src_ip" in raw:
        out["source.ip"] = raw["src_ip"]
        
    if "dest_ip" in raw:
        out["destination.ip"] = raw["dest_ip"]
        
    if "event_type" in raw:
        out["event.action"] = raw["event_type"]
        if raw["event_type"] == "alert":
            out["event.outcome"] = "failure"
            out["event.severity"] = "high"

def _normalize_csv(raw: Dict[str, Any], out: Dict[str, Any]):
    out["event.category"] = "file"
    
    # Try to find common IP fields
    for col in ["source_ip", "src_ip", "ip", "client_ip", "source"]:
        if col in raw and raw[col]:
            out["source.ip"] = raw[col]
            break

def _normalize_generic(raw: Dict[str, Any], out: Dict[str, Any]):
    pass
