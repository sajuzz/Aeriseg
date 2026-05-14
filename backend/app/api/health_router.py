import os
import sqlite3
from fastapi import APIRouter, Depends
from app.db.database import get_db_connection, DB_PATH
from app.core.auth import get_current_user

router = APIRouter()

@router.get("/system/health")
async def get_system_health(current_user: dict = Depends(get_current_user)):
    health = {
        "status": "healthy",
        "components": {},
        "stack": {
            "backend": "FastAPI (Python 3.11+)",
            "frontend": "React 18 + Vite + Tailwind",
            "database": "SQLite 3",
            "messaging": "NATS (Internal Mocked)",
            "orchestration": "AeriSeg Response Engine"
        }

    }
    
    # 1. Database Health
    try:
        conn = get_db_connection()
        conn.execute("SELECT 1").fetchone()
        db_size = os.path.getsize(DB_PATH) / (1024 * 1024) # MB
        health["components"]["database"] = {"status": "online", "size_mb": round(db_size, 2)}
        conn.close()
    except Exception as e:
        health["status"] = "degraded"
        health["components"]["database"] = {"status": "error", "message": str(e)}

    # 2. Rule Engine Health
    try:
        rules_dir = os.path.join(os.path.dirname(__file__), '../../detections')
        rule_count = len([f for f in os.listdir(rules_dir) if f.endswith('.yaml')])
        health["components"]["detection_engine"] = {"status": "active", "rules_loaded": rule_count}
    except:
        health["components"]["detection_engine"] = {"status": "warning", "message": "Rules directory missing"}

    # 3. Ingestion Health
    try:
        conn = get_db_connection()
        recent_count = conn.execute("SELECT COUNT(*) FROM telemetry WHERE timestamp > datetime('now', '-1 hour')").fetchone()[0]
        health["components"]["ingestion"] = {"status": "active", "events_last_hour": recent_count}
        conn.close()
    except:
        health["components"]["ingestion"] = {"status": "degraded"}

    # 4. Auth & User System
    try:
        conn = get_db_connection()
        user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        health["components"]["auth_system"] = {"status": "online", "users_registered": user_count}
        conn.close()
    except:
        health["components"]["auth_system"] = {"status": "offline"}

    return health
