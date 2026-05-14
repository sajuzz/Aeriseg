from typing import List, Dict, Optional
from app.db.database import get_db_connection

class AgentService:
    def get_agents(self) -> List[Dict]:
        conn = get_db_connection()
        try:
            rows = conn.execute("SELECT * FROM agents ORDER BY last_seen DESC").fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def get_agent_count(self) -> Dict:
        conn = get_db_connection()
        try:
            total = conn.execute("SELECT COUNT(*) FROM agents").fetchone()[0]
            online = conn.execute("SELECT COUNT(*) FROM agents WHERE status = 'ONLINE'").fetchone()[0]
            return {"total": total, "online": online}
        finally:
            conn.close()

    def update_agent_status(self, agent_id: str, status: str):
        conn = get_db_connection()
        try:
            conn.execute("UPDATE agents SET status = ?, last_seen = CURRENT_TIMESTAMP WHERE agent_id = ?", (status, agent_id))
            conn.commit()
        finally:
            conn.close()

agent_service = AgentService()
