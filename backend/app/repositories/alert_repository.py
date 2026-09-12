import json
from typing import List, Dict, Optional
from datetime import datetime
from app.db.database import get_db_connection
from app.repositories.base_repository import BaseAlertRepository

class AlertRepository(BaseAlertRepository):
    def process_alert(self, alert_data: dict) -> int:
        conn = get_db_connection()
        try:
            # Check for existing alert within last 30 minutes
            dedup_key = alert_data.get('dedup_key')
            
            existing = conn.execute("""
                SELECT id, dedup_count, first_seen FROM alerts 
                WHERE dedup_key = ? AND status IN ('NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'OPEN')
                AND (julianday('now') - julianday(last_seen)) * 24 * 60 <= 30
            """, (dedup_key,)).fetchone()

            if existing:
                alert_id = existing['id']
                new_count = existing['dedup_count'] + 1
                conn.execute("""
                    UPDATE alerts 
                    SET dedup_count = ?, last_seen = CURRENT_TIMESTAMP, raw_payload = ?
                    WHERE id = ?
                """, (new_count, json.dumps(alert_data.get('raw_payload', {})), alert_id))
                
                # Insert event mapping
                if 'source_event_id' in alert_data and alert_data['source_event_id']:
                    conn.execute("INSERT INTO alert_events (alert_id, event_id) VALUES (?, ?)", 
                                 (alert_id, alert_data['source_event_id']))
                conn.commit()
                return alert_id
            else:
                cursor = conn.execute("""
                    INSERT INTO alerts (
                        rule_id, title, severity, status, source_event_id, 
                        source_ip, host, dedup_key, raw_payload, mitre_technique, confidence_score, occurred_at, ingested_at, rule_version
                    ) VALUES (?, ?, ?, 'NEW', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    alert_data['rule_id'],
                    alert_data['title'],
                    alert_data['severity'],
                    alert_data.get('source_event_id'),
                    alert_data.get('source_ip'),
                    alert_data.get('host'),
                    dedup_key,
                    json.dumps(alert_data.get('raw_payload', {})),
                    alert_data.get('mitre_technique'),
                    alert_data.get('confidence_score', 0),
                    alert_data.get('occurred_at', datetime.utcnow().isoformat() + "Z"),
                    alert_data.get('ingested_at', datetime.utcnow().isoformat() + "Z"),
                    alert_data.get('rule_version', '1.0')
                ))
                
                new_alert_id = cursor.lastrowid
                
                # Insert event mapping
                if 'source_event_id' in alert_data and alert_data['source_event_id']:
                    conn.execute("INSERT INTO alert_events (alert_id, event_id) VALUES (?, ?)", 
                                 (new_alert_id, alert_data['source_event_id']))
                                 
                conn.commit()
                return new_alert_id
        finally:
            conn.close()

    def get_alerts(self, status: str = "OPEN", start_time: str = None, end_time: str = None) -> List[Dict]:
        conn = get_db_connection()
        try:
            query = """
                SELECT a.*, u.username as assigned_username, u.full_name as assigned_full_name
                FROM alerts a
                LEFT JOIN users u ON a.assigned_to = u.id
                WHERE a.status = ? OR (? = 'NEW' AND a.status = 'OPEN')
            """
            params = [status, status]
            
            if start_time and end_time:
                query += " AND a.occurred_at BETWEEN ? AND ?"
                params.extend([start_time, end_time])
                
            query += " ORDER BY a.occurred_at DESC"
            
            rows = conn.execute(query, params).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()


    def update_status(self, alert_id: int, status: str) -> None:
        conn = get_db_connection()
        try:
            conn.execute("UPDATE alerts SET status = ? WHERE id = ?", (status, alert_id))
            conn.commit()
        finally:
            conn.close()
            
    def promote_to_investigation(self, alert_id: int, investigation_id: str) -> None:
        conn = get_db_connection()
        try:
            conn.execute("""
                UPDATE alerts 
                SET investigation_id = ?, status = 'INVESTIGATING' 
                WHERE id = ?
            """, (investigation_id, alert_id))
            conn.commit()
        finally:
            conn.close()

    def get_by_id(self, alert_id: int) -> Optional[Dict]:
        conn = get_db_connection()
        try:
            row = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()
            if not row: return None
            alert = dict(row)
            
            # Fetch related event mappings
            events = conn.execute("""
                SELECT t.* FROM telemetry t
                JOIN alert_events ae ON t.event_id = ae.event_id
                WHERE ae.alert_id = ?
                ORDER BY t.timestamp DESC LIMIT 100
            """, (alert_id,)).fetchall()
            
            alert["related_events"] = []
            for ev in events:
                ev_dict = dict(ev)
                if 'raw_log' in ev_dict and isinstance(ev_dict['raw_log'], str):
                    try:
                        ev_dict['raw_log'] = json.loads(ev_dict['raw_log'])
                    except:
                        pass
                alert["related_events"].append(ev_dict)
                
            return alert
        finally:
            conn.close()

    def assign_alert(self, alert_id: int, user_id: int) -> bool:
        conn = get_db_connection()
        try:
            cursor = conn.execute("UPDATE alerts SET assigned_to = ? WHERE id = ?", (user_id, alert_id))
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

alert_repo = AlertRepository()

