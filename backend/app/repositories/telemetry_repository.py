from app.db.database import get_db_connection
import json
import uuid
from datetime import datetime

class TelemetryRepository:
    def insert(self, event: dict, conn=None) -> str:
        event_id = str(uuid.uuid4())
        _conn = conn or get_db_connection()
        cursor = _conn.cursor()
        cursor.execute(
            "INSERT INTO telemetry (event_id, timestamp, source, event_type, source_ip, raw_log, severity) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (event_id, event.get('timestamp', datetime.utcnow().isoformat()), event.get('source', ''), event.get('event_type', ''),
             event.get('source_ip', ''), json.dumps(event.get('raw_log', {})), event.get('severity', 'info'))
        )
        if not conn:
            _conn.commit()
            _conn.close()
        return event_id

    def get_event_by_id(self, event_id: str):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM telemetry WHERE event_id = ?", (event_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row)
        if 'raw_log' in d and isinstance(d['raw_log'], str):
            d['raw_log'] = json.loads(d['raw_log'])
        return d

    def query(self, where_clause: str, params: tuple, limit: int = 50, offset: int = 0) -> tuple:

        conn = get_db_connection()
        cursor = conn.cursor()
        
        count_query = "SELECT COUNT(*) FROM telemetry"
        if where_clause:
            count_query += f" WHERE {where_clause}"
        cursor.execute(count_query, params)
        total_count = cursor.fetchone()[0]
        
        base_query = "SELECT * FROM telemetry"
        if where_clause:
            base_query += f" WHERE {where_clause}"
            
        base_query += f" ORDER BY timestamp DESC LIMIT {limit} OFFSET {offset}"
        cursor.execute(base_query, params)
        rows = cursor.fetchall()
        conn.close()
        
        results = []
        for row in rows:
            d = dict(row)
            if 'raw_log' in d and isinstance(d['raw_log'], str):
                try:
                    d['raw_log'] = json.loads(d['raw_log'])
                except:
                    pass
            results.append(d)
            
        return results, total_count

    def get_by_ids(self, event_ids: list):
        conn = get_db_connection()
        cursor = conn.cursor()
        placeholders = ','.join(['?'] * len(event_ids))
        cursor.execute(f"SELECT * FROM telemetry WHERE event_id IN ({placeholders})", event_ids)
        rows = cursor.fetchall()
        conn.close()
        
        results = []
        for row in rows:
            d = dict(row)
            if 'raw_log' in d and isinstance(d['raw_log'], str):
                d['raw_log'] = json.loads(d['raw_log'])
            results.append(d)
        return results
        
telemetry_repo = TelemetryRepository()
