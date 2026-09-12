import structlog
from typing import Dict, List, Any
from app.movement_path.router import route_event
from app.movement_path.indexer import index_events
from app.movement_path.search import search_events, aggregate_events

log = structlog.get_logger()

class MovementPath:
    """
    MovementPath is the core abstraction for security event routing,
    normalization, storage lifecycle, and search.
    The SIEM interacts with this class rather than directly with Elasticsearch.
    """
    
    async def ingest_event(self, raw_event: Dict[str, Any], source_type: str, tenant_id: str) -> str:
        """
        Ingests a single raw event, normalizes it, routes it, and indexes it.
        """
        return await self.ingest_batch([raw_event], source_type, tenant_id)
        
    async def ingest_batch(self, raw_events: List[Dict[str, Any]], source_type: str, tenant_id: str) -> str:
        """
        Ingests a batch of raw events.
        """
        processed_events = []
        for event in raw_events:
            processed = await route_event(event, source_type, tenant_id)
            if processed:
                processed_events.append(processed)
                
        if processed_events:
            await index_events(processed_events)
            log.info("movement_path.ingest_batch", count=len(processed_events), tenant_id=tenant_id)
            
        return "success"
        
    async def search(self, query_dsl: Dict[str, Any], tenant_id: str, index_pattern: str = "aeriseg-events-*") -> Dict[str, Any]:
        """
        Executes a search query against the storage engine.
        """
        return await search_events(query_dsl, tenant_id, index_pattern)
        
    async def aggregate(self, agg_dsl: Dict[str, Any], tenant_id: str, index_pattern: str = "aeriseg-events-*") -> Dict[str, Any]:
        """
        Executes an aggregation query against the storage engine.
        """
        return await aggregate_events(agg_dsl, tenant_id, index_pattern)

movement_path = MovementPath()
