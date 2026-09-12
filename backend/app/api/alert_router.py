from fastapi import APIRouter, HTTPException, Body, Depends

from typing import List, Dict
from app.services.detection_service import detection_service
from app.repositories.alert_repository import alert_repo
from app.repositories.investigation_repository import investigation_repo
from app.core.auth import get_current_user


router = APIRouter()

@router.post("/detections/run")
async def run_detections():
    """Manually trigger the AeriSeg detection engine."""
    try:
        result = detection_service.run_detections()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

import datetime as dt
from dateutil.relativedelta import relativedelta

@router.get("/alerts")
async def get_alerts(status: str = "OPEN", time: str = None, from_time: str = None, to_time: str = None):
    try:
        now = dt.datetime.now(dt.timezone.utc)
        start_time = None
        end_time = None

        if from_time and to_time:
            start_time = from_time
            end_time = to_time
        elif time:
            time = time.lower()
            if time == 'today':
                start_time = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
                end_time = now.isoformat()
            elif time == 'yesterday':
                yesterday = now - dt.timedelta(days=1)
                start_time = yesterday.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
                end_time = yesterday.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
            elif time == '7d' or time == 'last_7_days':
                start_time = (now - dt.timedelta(days=7)).isoformat()
                end_time = now.isoformat()
            elif time == 'this_month':
                start_time = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
                end_time = now.isoformat()
            elif time == '15m':
                start_time = (now - dt.timedelta(minutes=15)).isoformat()
                end_time = now.isoformat()
            elif time == '1h':
                start_time = (now - dt.timedelta(hours=1)).isoformat()
                end_time = now.isoformat()
            else:
                # Default 24 hours
                start_time = (now - dt.timedelta(days=1)).isoformat()
                end_time = now.isoformat()
        else:
            # Default to Last 24 Hours if nothing is provided
            start_time = (now - dt.timedelta(days=1)).isoformat()
            end_time = now.isoformat()

        alerts = alert_repo.get_alerts(status, start_time, end_time)
        return {"status": "success", "data": alerts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/alerts/{alert_id}/promote")
async def promote_alert(alert_id: int):
    try:
        alert = alert_repo.get_by_id(alert_id)
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
            
        # Create investigation
        inv_data = {
            "title": f"Investigation: {alert['title']} [{alert['source_ip']}]",
            "description": f"Automatically promoted from Alert ID {alert_id}",
            "severity": alert['severity'],
            "author": "System"
        }
        # Updating this rule will immediately affect the background detection scheduler. 
        # Ensure ASQL syntax and YAML structure are valid.
        inv_id = investigation_repo.create(inv_data)
        
        # Link alert to investigation
        alert_repo.promote_to_investigation(alert_id, inv_id)
        
        # Link the triggering event as evidence
        if alert.get('source_event_id'):
            investigation_repo.add_event(inv_id, alert['source_event_id'])
            investigation_repo.add_activity(inv_id, "EVIDENCE_ADDED", f"Added source event from alert {alert_id}")
            
        return {"status": "success", "investigation_id": inv_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/alerts/{alert_id}/assign")
async def assign_alert(alert_id: int, user_id: int = Body(..., embed=True), current_user: dict = Depends(get_current_user)):
    try:
        success = alert_repo.assign_alert(alert_id, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Alert not found")
        return {"status": "success", "message": f"Alert assigned to user {user_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

