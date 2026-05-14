import uuid
import json
import structlog
from datetime import datetime
from typing import List, Dict, Optional
from app.db.database import get_db_connection
from app.providers.registry import get_provider

log = structlog.get_logger()

class ResponseService:
    def list_actions(self, investigation_id: str) -> List[Dict]:
        conn = get_db_connection()
        try:
            rows = conn.execute(
                "SELECT * FROM investigation_actions WHERE investigation_id = ? ORDER BY created_at DESC", 
                (investigation_id,)
            ).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def execute_action(self, investigation_id: str, action_type: str, target_type: str, target_value: str, notes: str = "", actor: str = "Analyst", dry_run: bool = False) -> str:
        action_id = str(uuid.uuid4())
        
        # 1. Create PENDING record
        conn = get_db_connection()
        try:
            status = 'DRY_RUN' if dry_run else 'PENDING'
            conn.execute("""
                INSERT INTO investigation_actions (id, investigation_id, action_type, target_type, target_value, notes, actor, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (action_id, investigation_id, action_type, target_type, target_value, notes, actor, status))
            conn.commit()
            
            # 2. Lookup provider from Registry
            provider = get_provider(action_type)
            if not provider:
                log.error("response_service.no_provider", action_type=action_type)
                raise ValueError(f"No provider found for action: {action_type}")
            
            # 3. Execute with dry_run flag
            result = provider.execute({
                "action_type": action_type,
                "target_type": target_type,
                "target_value": target_value,
                "notes": notes
            }, dry_run=dry_run)
            
            # 4. Update record with result
            final_status = 'EXECUTED'
            if dry_run:
                final_status = 'DRY_RUN'
            elif result.get('status') == 'failed':
                final_status = 'FAILED'
            elif result.get('status') == 'skipped':
                final_status = 'SKIPPED'

            conn.execute("""
                UPDATE investigation_actions 
                SET status = ?, result_metadata = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (final_status, json.dumps(result), action_id))
            conn.commit()
            
            return action_id
        except Exception as e:
            log.error("response_service.execution_failed", error=str(e))
            conn.execute("UPDATE investigation_actions SET status = 'FAILED', result_metadata = ? WHERE id = ?", (str(e), action_id))
            conn.commit()
            raise e
        finally:
            conn.close()

response_service = ResponseService()
