from fastapi import APIRouter, HTTPException, Depends
from app.services.agent_service import agent_service
from app.core.auth import get_current_user

router = APIRouter()

@router.get("/agents")
async def get_agents(current_user: dict = Depends(get_current_user)):
    try:
        return {"status": "success", "data": agent_service.get_agents()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/agents/stats")
async def get_agent_stats(current_user: dict = Depends(get_current_user)):
    try:
        return {"status": "success", "data": agent_service.get_agent_count()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
