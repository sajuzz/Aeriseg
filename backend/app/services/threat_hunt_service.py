import structlog
import uuid
import time
from app.models.schema import ThreatHuntQuery, ThreatHuntResponse
from app.query.tokenizer import tokenize
from app.query.parser import parse_tokens
from app.query.validators import validate_ast
from app.query.compiler import compile_to_es
from app.movement_path.core import movement_path
from app.db.database import get_db_connection
import asyncio

log = structlog.get_logger()

class ThreatHuntService:
    async def execute_query(self, query_obj: ThreatHuntQuery, tenant_id: str = "default_tenant") -> ThreatHuntResponse:
        start_time = time.time()
        query_id = str(uuid.uuid4())
        
        # 1. Pipeline: Tokenize -> Parse -> Validate -> Compile to ES DSL
        tokens = tokenize(query_obj.query)
        ast = parse_tokens(tokens)
        validated_ast = validate_ast(ast)
        query_dsl = compile_to_es(validated_ast)
        
        # 2. Time Filtering
        time_filters = []
        if query_obj.start_time and query_obj.end_time:
            time_filters.append({
                "range": {
                    "@timestamp": {
                        "gte": query_obj.start_time.isoformat(),
                        "lte": query_obj.end_time.isoformat()
                    }
                }
            })
        else:
            # Map time_range string to ES date math
            time_math = "now-24h"
            if query_obj.time_range == "1h": time_math = "now-1h"
            elif query_obj.time_range == "6h": time_math = "now-6h"
            elif query_obj.time_range == "7d": time_math = "now-7d"
            elif query_obj.time_range == "30d": time_math = "now-30d"
            
            time_filters.append({
                "range": {
                    "@timestamp": {
                        "gte": time_math
                    }
                }
            })
            
        # Add time filters to the ES query
        if "bool" not in query_dsl["query"]:
            query_dsl["query"] = {"bool": {"must": [query_dsl["query"]]}}
        if "filter" not in query_dsl["query"]["bool"]:
            query_dsl["query"]["bool"]["filter"] = []
            
        query_dsl["query"]["bool"]["filter"].extend(time_filters)
        
        # 3. Pagination & Execution
        query_dsl["from"] = (query_obj.page - 1) * query_obj.page_size
        query_dsl["size"] = query_obj.page_size
        query_dsl["sort"] = [{"@timestamp": {"order": "desc"}}]
        
        es_result = await movement_path.search(query_dsl, tenant_id)
        
        results = []
        total_count = 0
        if "hits" in es_result:
            total_count = es_result["hits"]["total"]["value"]
            for hit in es_result["hits"]["hits"]:
                source = hit["_source"]
                source["_id"] = hit["_id"]
                source["_index"] = hit["_index"]
                results.append(source)
        
        # 3. Enrichment (Basic stub for now)
        enriched_events = []
        for row in results:
            row["_enriched"] = True
            enriched_events.append(row)
            
        execution_time_ms = int((time.time() - start_time) * 1000)
        
        # 4. Audit logging
        self._audit_query(query_id, query_obj.query, execution_time_ms, len(enriched_events))
        
        # 5. Build Response
        metadata = {
            "query_id": query_id,
            "execution_time_ms": execution_time_ms,
            "page": query_obj.page,
            "page_size": query_obj.page_size
        }
        
        if query_obj.explain:
            metadata["explain"] = {
                "ast": validated_ast,
                "es_dsl": query_dsl
            }
            
        stats = {
            "returned_count": len(enriched_events),
            "total_count": total_count
        }
        
        return ThreatHuntResponse(
            events=enriched_events,
            metadata=metadata,
            stats=stats
        )
        
    def _audit_query(self, query_id: str, query: str, exec_time: int, count: int):
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO query_audit (id, query, execution_time_ms, result_count) VALUES (?, ?, ?, ?)",
                (query_id, query, exec_time, count)
            )
            conn.commit()
        except Exception as e:
            log.error("failed_audit_log", error=str(e))
        finally:
            conn.close()

threat_hunt_service = ThreatHuntService()
