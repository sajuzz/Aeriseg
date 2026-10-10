from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.incidents.service import incident_service
from app.database.session import get_db
from app.core.dependencies import get_current_user

router = APIRouter()

@router.get("/incidents")
async def get_incidents(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        tenant_id = current_user.get("tenant_id", 1) # Fallback to 1 for MVP
        
        # We need to map our generic list_incidents to the old format for backward compatibility
        incidents = await incident_service.list_incidents(db, tenant_id=tenant_id)
        
        # Serialize for response (mimicking the old format in app/services/incident_service.py)
        out = []
        for inc in incidents:
            inc_dict = {
                "id": inc.id,
                "title": inc.title,
                "severity": inc.severity.value,
                "status": inc.status.value,
                "created_at": inc.created_at.isoformat() if inc.created_at else None,
                "updated_at": inc.updated_at.isoformat() if inc.updated_at else None,
                "alerts": [{"id": a.id, "title": a.title, "severity": a.severity.value} for a in inc.alerts] if getattr(inc, 'alerts', None) else []
            }
            out.append(inc_dict)
            
        return {"status": "success", "data": out}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
