from fastapi import APIRouter, HTTPException, Depends
from app.services.incident_service import incident_service
from app.core.auth import get_current_user

router = APIRouter()

@router.get("/incidents")
async def get_incidents(current_user: dict = Depends(get_current_user)):
    try:
        tenant_id = current_user.get("tenant_id", 1) # Fallback to 1 for MVP
        incidents = await incident_service.get_incidents(tenant_id)
        return {"status": "success", "data": incidents}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
