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

    def enroll_agent(self, hostname: str, ip_address: str, os_type: str, enrollment_key: str) -> Dict:
        import uuid
        
        # Hardcoded static PSK for MVP
        VALID_KEY = "7f3a8c9d4e"
        if enrollment_key != VALID_KEY:
            raise ValueError("Invalid enrollment key")

        conn = get_db_connection()
        try:
            agent_id = str(uuid.uuid4())
            version = "1.0.0"
            os_version = "Generic"
            if os_type.lower() == "windows":
                os_version = "Windows Server 2022"
            elif os_type.lower() == "linux":
                os_version = "Ubuntu 22.04 LTS"
            elif os_type.lower() == "macos":
                os_version = "macOS 14 Sonoma"

            conn.execute(
                """INSERT INTO agents 
                   (agent_id, hostname, ip_address, os_type, os_version, version, status) 
                   VALUES (?, ?, ?, ?, ?, ?, 'ONLINE')""",
                (agent_id, hostname, ip_address, os_type, os_version, version)
            )
            conn.commit()
            
            row = conn.execute("SELECT * FROM agents WHERE agent_id = ?", (agent_id,)).fetchone()
            return dict(row)
        finally:
            conn.close()

    def register_agent(self, hostname: str, ip_address: str, os_type: str) -> Dict:
        # Alias for deploy endpoint
        return self.enroll_agent(hostname, ip_address, os_type, "7f3a8c9d4e")

    def get_agent_details(self, agent_id: str) -> Optional[Dict]:
        import random
        conn = get_db_connection()
        try:
            row = conn.execute("SELECT * FROM agents WHERE agent_id = ?", (agent_id,)).fetchone()
            if not row:
                return None
            
            agent = dict(row)
            
            # Generate deterministic mock metrics based on agent_id
            random.seed(agent_id)
            agent["kernel"] = f"5.15.{random.randint(10, 90)}-generic" if agent["os_type"].lower() == "linux" else f"10.0.{random.randint(19000, 22000)}"
            agent["cpu_usage"] = random.randint(5, 85)
            agent["ram_usage"] = random.randint(128, 4096)
            agent["logs_per_min"] = random.randint(10, 800)
            agent["alerts_generated"] = random.randint(0, 50)
            agent["installed_packages"] = random.randint(300, 1500)
            agent["running_services"] = random.randint(40, 150)
            
            return agent
        finally:
            conn.close()

agent_service = AgentService()
