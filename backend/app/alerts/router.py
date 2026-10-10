from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.alerts.service import alert_service
from app.database.session import get_db
from app.core.dependencies import get_current_user
from app.services.detection_service import detection_service

router = APIRouter()

@router.post("/detections/run")
async def run_detections():
    """Manually trigger the AeriSeg detection engine."""
    try:
        result = await detection_service.run_detections()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/alerts")
async def get_alerts(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        alerts = await alert_service.list_alerts(db, severity, status, limit, offset)
        return {"status": "success", "data": alerts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/alerts/{alert_id}")
async def get_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        alert = await alert_service.get_alert(db, alert_id)
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        return {"status": "success", "data": alert}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/alerts/{alert_id}/promote")
async def promote_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # This will be implemented when Incidents & Cases are refactored
    return {"status": "pending", "message": "Promote to investigation not yet fully migrated"}

@router.patch("/alerts/{alert_id}/assign")
async def assign_alert(
    alert_id: str,
    user_id: int = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # This will be implemented when Incidents & Cases are refactored
    return {"status": "pending", "message": "Assign alert not yet fully migrated"}
