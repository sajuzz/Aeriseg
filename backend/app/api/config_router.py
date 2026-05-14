from fastapi import APIRouter, HTTPException, Body
from app.db.database import get_db_connection

router = APIRouter()

@router.get("/config")
async def get_config():
    conn = get_db_connection()
    try:
        rows = conn.execute("SELECT key, value FROM system_config").fetchall()
        return {row['key']: row['value'] for row in rows}
    finally:
        conn.close()

@router.patch("/config/{key}")
async def update_config(key: str, value: str = Body(..., embed=True)):
    conn = get_db_connection()
    try:
        conn.execute("UPDATE system_config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?", (value, key))
        conn.commit()
        return {"status": "success", "key": key, "value": value}
    finally:
        conn.close()
