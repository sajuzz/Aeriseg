from fastapi import APIRouter, HTTPException
from app.models.schema import ThreatHuntQuery, ThreatHuntResponse
from app.services.threat_hunt_service import threat_hunt_service
import structlog

log = structlog.get_logger()
router = APIRouter()

@router.post("/query", response_model=ThreatHuntResponse)
async def execute_threat_hunt(query: ThreatHuntQuery):
    try:
        response = await threat_hunt_service.execute_query(query)
        return response
    except Exception as e:
        log.error("threat_hunt_error", error=str(e))
        raise HTTPException(
            status_code=400,
            detail={
                "status": "error",
                "message": "Failed to execute query",
                "metadata": {"error_details": str(e)}
            }
        )
