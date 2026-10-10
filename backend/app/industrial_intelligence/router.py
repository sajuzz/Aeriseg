"""
Industrial Intelligence REST API Router
---------------------------------------
Exposes secure endpoints under `/api/industrial-intelligence`.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status, Body
import structlog

from app.industrial_intelligence.schemas import (
    IndustrialAsset,
    AssetType,
    AssetCriticality,
    PurdueLevel,
    AssetCreateRequest,
    AssetUpdateRequest,
    ImpactScoreResult,
    CorrelatedIncident,
    IncidentExplanation,
    ResponseRecommendation,
    ApprovalDecisionRequest,
)
from app.industrial_intelligence.service import industrial_service

log = structlog.get_logger()

router = APIRouter(prefix="/industrial-intelligence", tags=["Industrial Intelligence"])


# Optional auth dependency helper to avoid crashing if token header is absent in demo mode
async def get_optional_user():
    return {"username": "soc_analyst", "role": "ANALYST"}


# ── Asset Inventory Endpoints ──────────────────────────────────────────────

@router.get("/assets", response_model=List[IndustrialAsset])
async def list_assets(
    asset_type: Optional[AssetType] = None,
    criticality: Optional[AssetCriticality] = None,
    purdue_level: Optional[PurdueLevel] = None,
):
    """Lists registered industrial manufacturing assets."""
    return industrial_service.list_assets(asset_type, criticality, purdue_level)


@router.post("/assets", response_model=IndustrialAsset, status_code=status.HTTP_201_CREATED)
async def create_asset(req: AssetCreateRequest):
    """Registers a new industrial asset."""
    try:
        return industrial_service.create_asset(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/assets/{asset_id}", response_model=IndustrialAsset)
async def get_asset(asset_id: str):
    """Retrieves metadata and criticality for a specific industrial asset."""
    asset = industrial_service.get_asset(asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset '{asset_id}' not found")
    return asset


@router.patch("/assets/{asset_id}", response_model=IndustrialAsset)
async def update_asset(asset_id: str, updates: AssetUpdateRequest):
    """Updates fields of an existing industrial asset."""
    try:
        return industrial_service.update_asset(asset_id, updates)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Asset '{asset_id}' not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/assets/{asset_id}/maintenance", response_model=IndustrialAsset)
async def set_asset_maintenance(
    asset_id: str,
    is_active: bool = Body(..., embed=True),
    reason: Optional[str] = Body(None, embed=True),
):
    """Sets or clears an active maintenance window on an asset."""
    try:
        return industrial_service.set_maintenance(asset_id, is_active, reason)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Asset '{asset_id}' not found")


# ── Assessment & Scoring Endpoints ─────────────────────────────────────────

@router.post("/assess-alert", response_model=ImpactScoreResult)
async def assess_alert(
    security_severity: str = Body("MEDIUM", embed=True),
    asset_id: Optional[str] = Body(None, embed=True),
    confidence: float = Body(65.0, embed=True),
    event_data: Optional[Dict[str, Any]] = Body(None, embed=True),
):
    """Calculates deterministic manufacturing impact and priority scores for an alert."""
    return industrial_service.assess_event(
        security_severity=security_severity,
        asset_id=asset_id,
        confidence=confidence,
        event_data=event_data,
    )


# ── Incident Correlation & Triage Endpoints ────────────────────────────────

@router.post("/events", status_code=status.HTTP_200_OK)
async def ingest_event(event: Dict[str, Any] = Body(...)):
    """Ingests an industrial security event into the correlation engine."""
    incident = industrial_service.ingest_event(event)
    return {
        "status": "success",
        "correlated": incident is not None,
        "incident_id": incident.incident_id if incident else None,
        "event_count": incident.event_count if incident else 0,
    }


@router.get("/incidents", response_model=List[CorrelatedIncident])
async def list_incidents():
    """Retrieves all active correlated industrial security incidents."""
    return industrial_service.list_incidents()


@router.get("/incidents/{incident_id}", response_model=CorrelatedIncident)
async def get_incident(incident_id: str):
    """Retrieves details of a specific correlated incident."""
    inc = industrial_service.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")
    return inc


@router.get("/incidents/{incident_id}/explanation", response_model=IncidentExplanation)
async def get_incident_explanation(incident_id: str):
    """Generates an evidence-backed factual explanation report and AI synthesis."""
    explanation = industrial_service.get_incident_explanation(incident_id)
    if not explanation:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")
    return explanation


@router.get("/incidents/{incident_id}/recommendations", response_model=List[ResponseRecommendation])
async def get_incident_recommendations(incident_id: str):
    """Retrieves safety-first operational response recommendations."""
    recs = industrial_service.get_incident_recommendations(incident_id)
    if recs is None:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")
    return recs


@router.post("/recommendations/{rec_id}/decision", response_model=ResponseRecommendation)
async def record_approval_decision(
    rec_id: str,
    req: ApprovalDecisionRequest,
):
    """Records human review decision (APPROVED/REJECTED) on response recommendations."""
    try:
        log.info("approval_decision.recorded", rec_id=rec_id, decision=req.decision, reviewer=req.reviewer)
        return industrial_service.record_decision(
            recommendation_id=rec_id,
            decision=req.decision,
            reviewer=req.reviewer,
            reason=req.reason,
        )
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Recommendation '{rec_id}' not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Synthetic Demonstration Scenarios ──────────────────────────────────────

from app.industrial_intelligence.scenarios import SCENARIOS_CATALOG, run_scenario

@router.get("/scenarios", response_model=List[Dict[str, Any]])
async def list_scenarios():
    """Lists available synthetic manufacturing demonstration scenarios (A through F)."""
    return SCENARIOS_CATALOG


@router.post("/scenarios/{scenario_id}/run")
async def execute_scenario(scenario_id: str):
    """Triggers execution of a synthetic scenario for live demonstration."""
    try:
        return run_scenario(scenario_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
