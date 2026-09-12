import structlog
from typing import List, Dict, Any
from app.db.es import get_es_client
import uuid
import datetime

log = structlog.get_logger()

async def index_events(events: List[Dict[str, Any]]):
    """
    Bulk indexes a batch of normalized events into Elasticsearch.
    """
    client = get_es_client()
    if not client:
        log.error("movement_path.indexer.no_client")
        return
        
    operations = []
    
    # We use a time-based index for hot storage, e.g., aeriseg-events-YYYY-MM-DD
    # This prepares the groundwork for lifecycle management (Hot/Warm/Cold)
    index_name = f"aeriseg-events-{datetime.datetime.utcnow().strftime('%Y-%m-%d')}"
    
    for event in events:
        operations.append({
            "index": {
                "_index": index_name,
                "_id": str(uuid.uuid4())
            }
        })
        operations.append(event)
        
    if not operations:
        return
        
    try:
        response = await client.bulk(operations=operations)
        if response.get("errors"):
            log.error("movement_path.indexer.bulk_errors", errors=response.get("items"))
        else:
            log.info("movement_path.indexer.success", count=len(events))
    except Exception as e:
        log.error("movement_path.indexer.failed", error=str(e))
