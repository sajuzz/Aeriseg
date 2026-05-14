from fastapi import APIRouter, HTTPException
from typing import List, Dict
from app.models.dashboard import CustomDashboard
from app.services.dashboard_service import dashboard_service

router = APIRouter()

@router.get("/dashboards")
async def get_dashboards():
    try:
        return {"status": "success", "data": dashboard_service.get_dashboards()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/dashboards")
async def create_dashboard(dashboard: CustomDashboard):
    try:
        dash_id = dashboard_service.create_dashboard(dashboard)
        return {"status": "success", "dashboard_id": dash_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboards/{dash_id}")
async def get_dashboard(dash_id: int):
    try:
        dash = dashboard_service.get_dashboard_by_id(dash_id)
        if not dash:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        return {"status": "success", "data": dash}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboards/widgets/{widget_id}/evaluate")
async def evaluate_widget(widget_id: int):
    try:
        data = dashboard_service.evaluate_widget(widget_id)
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
