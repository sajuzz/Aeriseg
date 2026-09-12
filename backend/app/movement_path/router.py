import structlog
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from app.movement_path.normalizer import normalize_event

log = structlog.get_logger()

async def route_event(raw_event: Dict[str, Any], source_type: str, tenant_id: str) -> Optional[Dict[str, Any]]:
    """
    Routes an event by determining its schema, normalizing it, and preparing it for indexing.
    """
    try:
        normalized = await normalize_event(raw_event, source_type)
        if not normalized:
            return None
            
        # Enrich with tenant ID and ensure timestamp
        normalized["tenant.id"] = tenant_id
        if "@timestamp" not in normalized:
            normalized["@timestamp"] = datetime.now(timezone.utc).isoformat()
            
        return normalized
    except Exception as e:
        log.error("movement_path.route_failed", error=str(e), source_type=source_type)
        return None
