from fastapi import APIRouter, HTTPException, Body
from app.services.investigation_service import investigation_service
from app.services.related_event_service import related_event_service
from app.services.correlation_engine import correlation_engine
from app.services.export_service import export_service
from app.services.response_service import response_service
from typing import List




router = APIRouter()

@router.get("/investigations")
async def list_investigations():
    return investigation_service.list_investigations()

@router.post("/investigations")
async def create_investigation(title: str = Body(..., embed=True), severity: str = Body("MEDIUM", embed=True)):
    inv_id = investigation_service.create_investigation(title, severity)
    return {"status": "success", "investigation_id": inv_id}

@router.get("/investigations/{inv_id}")
async def get_investigation(inv_id: str):
    details = investigation_service.get_details(inv_id)
    if not details:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return details

@router.post("/investigations/{inv_id}/events")
async def add_events(inv_id: str, event_ids: List[str] = Body(..., embed=True)):
    try:
        investigation_service.add_events(inv_id, event_ids)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/investigations/{inv_id}/notes")
async def add_note(inv_id: str, content: str = Body(..., embed=True), author: str = Body("Analyst", embed=True)):
    note_id = investigation_service.add_note(inv_id, content, author)
    return {"status": "success", "note_id": note_id}

@router.patch("/investigations/{inv_id}/status")
async def update_status(inv_id: str, status: str = Body(..., embed=True)):
    try:
        investigation_service.update_status(inv_id, status)
        return {"status": "success"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/investigations/{inv_id}/priority")
async def update_priority(inv_id: str, priority: str = Body(..., embed=True)):
    try:
        investigation_service.update_priority(inv_id, priority)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/investigations/{inv_id}/artifacts")
async def add_artifact(inv_id: str, data: dict = Body(...)):
    try:
        art_id = investigation_service.add_artifact(
            inv_id, 
            data.get('artifact_type', 'LOG_FILE'), 
            data.get('description', 'Forensic Artifact'),
            data.get('content')
        )
        return {"status": "success", "artifact_id": art_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/events/{event_id}/related")
async def get_related_events(event_id: str):
    return related_event_service.find_related(event_id)

@router.get("/events/{event_id}/correlations")
async def get_event_correlations(event_id: str, min_score: int = 30, limit: int = 12):
    try:
        correlations = correlation_engine.get_correlations(event_id, min_score=min_score, limit=limit)
        return {
            "status": "success",
            "data": correlations,
            "metadata": {
                "base_event_id": event_id,
                "min_score": min_score,
                "returned": len(correlations)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/investigations/{inv_id}/timeline")
async def get_investigation_timeline(inv_id: str):
    try:
        timeline = investigation_service.get_unified_timeline(inv_id)
        return {
            "status": "success",
            "data": timeline,
            "metadata": {
                "investigation_id": inv_id,
                "total_entries": len(timeline)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/investigations/{inv_id}/export")
async def export_investigation(inv_id: str, format: str = "md"):
    try:
        if format == "md":
            content = export_service.export_markdown(inv_id)
            return {
                "status": "success",
                "format": "markdown",
                "content": content
            }
        elif format == "json":
            content = export_service.export_json(inv_id)
            return {
                "status": "success",
                "format": "json",
                "content": content
            }
        else:
            raise HTTPException(status_code=400, detail="Unsupported format. Use 'md' or 'json'.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/investigations/{inv_id}/actions")
async def list_actions(inv_id: str):
    return {"status": "success", "data": response_service.list_actions(inv_id)}

@router.post("/investigations/{inv_id}/actions")
async def execute_action(inv_id: str, payload: dict = Body(...)):
    try:
        dry_run = payload.get('dry_run', False)
        action_id = response_service.execute_action(
            investigation_id=inv_id,
            action_type=payload['action_type'],
            target_type=payload['target_type'],
            target_value=payload['target_value'],
            notes=payload.get('notes', ''),
            actor="Analyst",
            dry_run=dry_run
        )
        
        # Log to activity timeline as well
        from app.repositories.investigation_repository import investigation_repo
        msg = f"Executed {payload['action_type']} on {payload['target_value']}"
        if dry_run:
            msg = f"[SIMULATION] {msg}"

        investigation_repo.add_activity(
            inv_id, 
            "ACTION_EXECUTED", 
            msg,
            meta={"action_id": action_id, "type": payload['action_type'], "target": payload['target_value'], "dry_run": dry_run}
        )
        
        return {"status": "success", "action_id": action_id}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))




