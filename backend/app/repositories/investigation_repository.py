from app.db.database import get_db_connection
import json
import uuid
from datetime import datetime

class InvestigationRepository:
    def create(self, title: str, severity: str = "MEDIUM", conn=None) -> str:
        inv_id = str(uuid.uuid4())
        _conn = conn or get_db_connection()
        cursor = _conn.cursor()
        cursor.execute(
            "INSERT INTO investigations (id, title, status, severity, priority) VALUES (?, ?, ?, ?, ?)",
            (inv_id, title, "OPEN", severity, 'MEDIUM')
        )
        if not conn:
            _conn.commit()
            _conn.close()
        return inv_id

    def get_by_id(self, inv_id: str):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM investigations WHERE id = ?", (inv_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def list_all(self):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM investigations ORDER BY updated_at DESC")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def update_status(self, inv_id: str, status: str, conn=None):
        _conn = conn or get_db_connection()
        cursor = _conn.cursor()
        cursor.execute(
            "UPDATE investigations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (status, inv_id)
        )
        if not conn:
            _conn.commit()
            _conn.close()

    def update_priority(self, inv_id: str, priority: str, conn=None):
        _conn = conn or get_db_connection()
        cursor = _conn.cursor()
        cursor.execute(
            "UPDATE investigations SET priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (priority, inv_id)
        )
        if not conn:
            _conn.commit()
            _conn.close()

    def add_event(self, inv_id: str, event_id: str, conn=None):
        _conn = conn or get_db_connection()
        cursor = _conn.cursor()
        cursor.execute(
            "INSERT OR IGNORE INTO investigation_events (investigation_id, event_id) VALUES (?, ?)",
            (inv_id, event_id)
        )
        cursor.execute("UPDATE investigations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (inv_id,))
        if not conn:
            _conn.commit()
            _conn.close()

    def add_note(self, inv_id: str, content: str, author: str = "Analyst", conn=None):
        _conn = conn or get_db_connection()
        cursor = _conn.cursor()
        cursor.execute("SELECT id FROM users WHERE username = ? OR full_name = ?", (author, author))
        user_row = cursor.fetchone()
        user_id = user_row['id'] if user_row else 1
        cursor.execute(
            "INSERT INTO investigation_notes (investigation_id, user_id, content) VALUES (?, ?, ?)",
            (inv_id, user_id, content)
        )
        cursor.execute("UPDATE investigations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (inv_id,))
        if not conn:
            _conn.commit()
            _conn.close()
        return cursor.lastrowid

    def get_notes(self, inv_id: str):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT n.*, u.username 
            FROM investigation_notes n
            LEFT JOIN users u ON n.user_id = u.id
            WHERE n.investigation_id = ?
            ORDER BY n.created_at DESC
        """, (inv_id,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def add_activity(self, inv_id: str, activity_type: str, message: str, meta: dict = None, conn=None):
        act_id = str(uuid.uuid4())
        _conn = conn or get_db_connection()
        cursor = _conn.cursor()
        cursor.execute(
            "INSERT INTO investigation_activity (id, investigation_id, activity_type, message, metadata) VALUES (?, ?, ?, ?, ?)",
            (act_id, inv_id, activity_type, message, json.dumps(meta or {}))
        )
        if not conn:
            _conn.commit()
            _conn.close()
        return act_id

    def get_timeline(self, inv_id: str):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM investigation_activity WHERE investigation_id = ? ORDER BY created_at ASC", (inv_id,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def get_events(self, inv_id: str):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT t.* FROM telemetry t
            JOIN investigation_events ie ON t.event_id = ie.event_id
            WHERE ie.investigation_id = ?
        """, (inv_id,))
        rows = cursor.fetchall()
        conn.close()
        
        results = []
        for row in rows:
            d = dict(row)
            d['raw_log'] = json.loads(d['raw_log'])
            results.append(d)
        return results

    def get_artifacts(self, inv_id: str):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM investigation_artifacts WHERE investigation_id = ? ORDER BY created_at DESC", (inv_id,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def add_artifact(self, inv_id: str, artifact_type: str, description: str, content: str = None, file_path: str = None, conn=None):
        art_id = str(uuid.uuid4())
        _conn = conn or get_db_connection()
        cursor = _conn.cursor()
        cursor.execute("""
            INSERT INTO investigation_artifacts (id, investigation_id, artifact_type, description, content, file_path)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (art_id, inv_id, artifact_type, description, content, file_path))
        if not conn:
            _conn.commit()
            _conn.close()
        return art_id

investigation_repo = InvestigationRepository()
