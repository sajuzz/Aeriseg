import structlog
import uuid
import time
from app.models.schema import ThreatHuntQuery, ThreatHuntResponse
from app.query.tokenizer import tokenize
from app.query.parser import parse_tokens
from app.query.validators import validate_ast
from app.query.compiler import compile_to_sql
from app.repositories.telemetry_repository import telemetry_repo
from app.db.database import get_db_connection

log = structlog.get_logger()

class ThreatHuntService:
    def execute_query(self, query_obj: ThreatHuntQuery) -> ThreatHuntResponse:
        start_time = time.time()
        query_id = str(uuid.uuid4())
        
        # 1. Pipeline: Tokenize -> Parse -> Validate -> Compile
        tokens = tokenize(query_obj.query)
        ast = parse_tokens(tokens)
        validated_ast = validate_ast(ast)
        where_clause, params = compile_to_sql(validated_ast)
        
        # 2. Time Filtering
        time_filters = []
        if query_obj.start_time and query_obj.end_time:
            time_filters.append("(timestamp BETWEEN ? AND ?)")
            params = params + (query_obj.start_time.isoformat(), query_obj.end_time.isoformat())
        else:
            # Map time_range string to seconds
            seconds = 86400 # default 24h
            if query_obj.time_range == "1h": seconds = 3600
            elif query_obj.time_range == "6h": seconds = 21600
            elif query_obj.time_range == "7d": seconds = 604800
            elif query_obj.time_range == "30d": seconds = 2592000
            
            time_filters.append("(julianday('now') - julianday(timestamp)) * 86400 <= ?")
            params = params + (seconds,)
        
        if where_clause:
            where_clause = f"({where_clause}) AND {' AND '.join(time_filters)}"
        else:
            where_clause = " AND ".join(time_filters)
        
        # 3. Pagination & Execution

        offset = (query_obj.page - 1) * query_obj.page_size
        results, total_count = telemetry_repo.query(
            where_clause=where_clause, 
            params=params, 
            limit=query_obj.page_size, 
            offset=offset
        )
        
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
                "sql_where": where_clause,
                "sql_params": params
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
