import structlog
from typing import Dict, Any
from app.db.es import get_es_client

log = structlog.get_logger()

async def search_events(query_dsl: Dict[str, Any], tenant_id: str, index_pattern: str) -> Dict[str, Any]:
    """
    Executes a search query against Elasticsearch, enforcing tenant isolation.
    """
    client = get_es_client()
    if not client:
        return {"hits": {"hits": [], "total": {"value": 0}}}
        
    # Enforce tenant isolation
    tenant_filter = {"term": {"tenant.id": tenant_id}}
    
    # Inject tenant filter into the query
    if "query" not in query_dsl:
        query_dsl["query"] = {"bool": {"filter": [tenant_filter]}}
    elif "bool" in query_dsl["query"]:
        if "filter" not in query_dsl["query"]["bool"]:
            query_dsl["query"]["bool"]["filter"] = []
        if isinstance(query_dsl["query"]["bool"]["filter"], list):
            query_dsl["query"]["bool"]["filter"].append(tenant_filter)
        else:
            query_dsl["query"]["bool"]["filter"] = [query_dsl["query"]["bool"]["filter"], tenant_filter]
    else:
        # Wrap existing query in a bool
        original_query = query_dsl["query"]
        query_dsl["query"] = {
            "bool": {
                "must": [original_query],
                "filter": [tenant_filter]
            }
        }
        
    try:
        response = await client.search(index=index_pattern, body=query_dsl)
        return response
    except Exception as e:
        log.error("movement_path.search.failed", error=str(e))
        return {"hits": {"hits": [], "total": {"value": 0}}, "error": str(e)}

async def aggregate_events(agg_dsl: Dict[str, Any], tenant_id: str, index_pattern: str) -> Dict[str, Any]:
    """
    Executes an aggregation query against Elasticsearch.
    """
    # Aggregation uses the exact same tenant-isolation logic as search
    return await search_events(agg_dsl, tenant_id, index_pattern)
