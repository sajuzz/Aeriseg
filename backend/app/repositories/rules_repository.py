from typing import List, Dict, Optional
from app.db.database import get_db_connection

class RulesRepository:
    def get_all_rules(self) -> List[Dict]:
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM detection_rules ORDER BY created_at DESC")
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()
            
    def get_rule_by_id(self, rule_id: str) -> Optional[Dict]:
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM detection_rules WHERE id = ?", (rule_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

rules_repository = RulesRepository()
