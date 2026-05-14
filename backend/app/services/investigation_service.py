import structlog
from app.repositories.investigation_repository import investigation_repo
from app.services.correlation_engine import correlation_engine
from app.db.database import transaction, get_db_connection
from datetime import datetime
from typing import List, Dict

log = structlog.get_logger()

ALLOWED_TRANSITIONS = {
    "OPEN": ["TRIAGED", "INVESTIGATING", "CLOSED", "FALSE_POSITIVE"],
    "TRIAGED": ["INVESTIGATING", "CLOSED", "FALSE_POSITIVE"],
    "INVESTIGATING": ["CONTAINED", "RESOLVED", "CLOSED", "FALSE_POSITIVE"],
    "CONTAINED": ["RESOLVED", "CLOSED"],
    "RESOLVED": ["CLOSED", "OPEN"],
    "FALSE_POSITIVE": ["CLOSED", "OPEN"],
    "CLOSED": ["OPEN"]
}

class InvestigationService:
    def create_investigation(self, title: str, severity: str = "MEDIUM"):
        with transaction() as conn:
            inv_id = investigation_repo.create(title, severity, conn=conn)
            investigation_repo.add_activity(
                inv_id, "CREATION", f"Investigation created: {title}", conn=conn
            )
            return inv_id

    def add_events(self, inv_id: str, event_ids: list):
        with transaction() as conn:
            for eid in event_ids:
                investigation_repo.add_event(inv_id, eid, conn=conn)
            
            investigation_repo.add_activity(
                inv_id, "EVIDENCE_ADDED", f"Added {len(event_ids)} events to investigation", 
                meta={"event_count": len(event_ids)}, 
                conn=conn
            )

    def add_note(self, inv_id: str, content: str, author: str = "Analyst"):
        with transaction() as conn:
            note_id = investigation_repo.add_note(inv_id, content, author, conn=conn)
            investigation_repo.add_activity(
                inv_id, "NOTE_ADDED", f"Analyst {author} added a note", 
                meta={"note_id": note_id}, 
                conn=conn
            )
            return note_id

    def update_status(self, inv_id: str, new_status: str):
        inv = investigation_repo.get_by_id(inv_id)
        if not inv:
            raise ValueError("Investigation not found")
        
        current_status = inv["status"]
        if new_status not in ALLOWED_TRANSITIONS.get(current_status, []):
            raise ValueError(f"Invalid status transition from {current_status} to {new_status}")

        with transaction() as conn:
            investigation_repo.update_status(inv_id, new_status, conn=conn)
            investigation_repo.add_activity(
                inv_id, "STATUS_CHANGE", f"Status changed from {current_status} to {new_status}", 
                conn=conn
            )

    def update_priority(self, inv_id: str, priority: str):
        with transaction() as conn:
            investigation_repo.update_priority(inv_id, priority, conn=conn)
            investigation_repo.add_activity(
                inv_id, "PRIORITY_CHANGE", f"Priority updated to {priority}", 
                conn=conn
            )

    def add_artifact(self, inv_id: str, artifact_type: str, description: str, content: str = None):
        with transaction() as conn:
            art_id = investigation_repo.add_artifact(inv_id, artifact_type, description, content=content, conn=conn)
            investigation_repo.add_activity(
                inv_id, "ARTIFACT_ADDED", f"Forensic artifact added: {description}", 
                meta={"artifact_id": art_id, "type": artifact_type}, 
                conn=conn
            )
            return art_id

    def get_details(self, inv_id: str):
        inv = investigation_repo.get_by_id(inv_id)
        if not inv:
            return None
        
        return {
            "investigation": inv,
            "events": investigation_repo.get_events(inv_id),
            "timeline": investigation_repo.get_timeline(inv_id),
            "notes": investigation_repo.get_notes(inv_id),
            "artifacts": investigation_repo.get_artifacts(inv_id)
        }

    def list_investigations(self):
        return investigation_repo.list_all()

    def get_correlated_events_for_investigation(self, inv_id: str, event_id: str):
        correlations = correlation_engine.get_correlations(event_id)
        existing_events = investigation_repo.get_events(inv_id)
        existing_ids = {e["event_id"] for e in existing_events}
        return [c for c in correlations if c["event_id"] not in existing_ids]

    def get_unified_timeline(self, investigation_id: str) -> List[Dict]:
        conn = get_db_connection()
        try:
            activity_rows = conn.execute("""
                SELECT id, created_at as timestamp, activity_type, message, metadata
                FROM investigation_activity
                WHERE investigation_id = ?
                ORDER BY created_at
            """, (investigation_id,)).fetchall()

            evidence_rows = conn.execute("""
                SELECT ie.added_at as timestamp, t.event_id, t.severity, t.event_type, t.source, t.source_ip
                FROM investigation_events ie
                JOIN telemetry t ON t.event_id = ie.event_id
                WHERE ie.investigation_id = ?
                ORDER BY ie.added_at
            """, (investigation_id,)).fetchall()

            timeline = []
            for row in activity_rows:
                rd = dict(row)
                timeline.append({
                    "id": f"act_{rd['id']}",
                    "timestamp": rd["timestamp"],
                    "type": "ACTIVITY",
                    "icon": self._map_activity_icon(rd["activity_type"]),
                    "title": rd["activity_type"].replace("_", " ").title(),
                    "description": rd["message"],
                    "metadata": rd.get("metadata")
                })

            for row in evidence_rows:
                rd = dict(row)
                timeline.append({
                    "id": f"ev_{rd['event_id']}",
                    "timestamp": rd["timestamp"],
                    "type": "EVIDENCE",
                    "icon": "event",
                    "title": rd["event_type"] or "Telemetry Event",
                    "description": "Evidence added to case",
                    "severity": rd["severity"],
                    "event_id": rd["event_id"],
                    "event_summary": f"{rd['source']} • {rd.get('source_ip')}".strip(' •')
                })

            timeline.sort(key=lambda x: datetime.fromisoformat(str(x["timestamp"]).replace("Z", "+00:00")))
            return timeline
        finally:
            conn.close()

    def _map_activity_icon(self, activity_type: str) -> str:
        mapping = {
            "CREATION": "created",
            "EVIDENCE_ADDED": "event",
            "NOTE_ADDED": "note",
            "STATUS_CHANGE": "status",
            "PRIORITY_CHANGE": "alert"
        }
        return mapping.get(activity_type, "activity")

investigation_service = InvestigationService()
