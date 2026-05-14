from app.db.database import get_db_connection
from datetime import datetime, timedelta
import json

class RelatedEventService:
    def find_related(self, event_id: str):
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # 1. Fetch seed event
        cursor.execute("SELECT * FROM telemetry WHERE event_id = ?", (event_id,))
        seed = cursor.fetchone()
        if not seed:
            return []
        
        seed_time = datetime.fromisoformat(seed['timestamp'])
        start_window = (seed_time - timedelta(minutes=30)).isoformat()
        end_window = (seed_time + timedelta(minutes=30)).isoformat()
        
        # 2. Logic: Same source_ip OR same source within 30 min window
        cursor.execute("""
            SELECT * FROM telemetry 
            WHERE (source_ip = ? OR source = ?)
            AND event_id != ?
            AND timestamp BETWEEN ? AND ?
            ORDER BY timestamp DESC
            LIMIT 50
        """, (seed['source_ip'], seed['source'], event_id, start_window, end_window))
        
        rows = cursor.fetchall()
        conn.close()
        
        results = []
        for row in rows:
            d = dict(row)
            d['raw_log'] = json.loads(d['raw_log'])
            results.append(d)
        return results

related_event_service = RelatedEventService()
