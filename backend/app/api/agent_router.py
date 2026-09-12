from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.agent_service import agent_service
from app.core.auth import get_current_user

router = APIRouter()

class DeployAgentRequest(BaseModel):
    hostname: str
    ip_address: str
    os_type: str
    enrollment_key: str = "AERISEG_DEFAULT_KEY"

class AgentHeartbeatRequest(BaseModel):
    status: str = "ONLINE"

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

@router.post("/agents/deploy")
async def deploy_agent(req: DeployAgentRequest, current_user: dict = Depends(get_current_user)):
    try:
        agent = agent_service.register_agent(
            hostname=req.hostname,
            ip_address=req.ip_address,
            os_type=req.os_type
        )
        return {"status": "success", "data": agent}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/agents/enroll")
async def enroll_agent(req: DeployAgentRequest):
    # Public endpoint for agents to enroll via key
    try:
        agent = agent_service.enroll_agent(
            hostname=req.hostname,
            ip_address=req.ip_address,
            os_type=req.os_type,
            enrollment_key=req.enrollment_key
        )
        return {"status": "success", "data": agent}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/agents/register")
async def register_agent(req: DeployAgentRequest):
    # Backward compatibility
    return await enroll_agent(req)

@router.post("/agents/{agent_id}/heartbeat")
async def agent_heartbeat(agent_id: str, req: AgentHeartbeatRequest):
    # Public endpoint for agents to heartbeat
    try:
        agent_service.update_agent_status(agent_id, req.status)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/agents/{agent_id}")
async def get_agent_detail(agent_id: str, current_user: dict = Depends(get_current_user)):
    try:
        agent = agent_service.get_agent_details(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        return {"status": "success", "data": agent}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

