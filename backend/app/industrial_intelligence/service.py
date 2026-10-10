"""
Industrial Intelligence Orchestration Service
-----------------------------------------------
Coordinating service integrating asset registry, event correlation,
impact scoring, explanation reports, and response approvals.
"""

from typing import List, Dict, Any, Optional
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
    SecuritySeverity,
)
from app.industrial_intelligence.asset_registry import asset_registry
from app.industrial_intelligence.impact_scoring import impact_scorer
from app.industrial_intelligence.event_correlation import correlation_engine
from app.industrial_intelligence.explainability import explainability_engine
from app.industrial_intelligence.recommendations import recommendation_engine

log = structlog.get_logger()


class IndustrialIntelligenceService:
    def __init__(self):
        self.registry = asset_registry
        self.scorer = impact_scorer
        self.correlator = correlation_engine
        self.explainer = explainability_engine
        self.recommender = recommendation_engine

    # --- Asset Operations ---
    def list_assets(
        self,
        asset_type: Optional[AssetType] = None,
        criticality: Optional[AssetCriticality] = None,
        purdue_level: Optional[PurdueLevel] = None,
    ) -> List[IndustrialAsset]:
        return self.registry.list_assets(asset_type, criticality, purdue_level)

    def get_asset(self, asset_id: str) -> Optional[IndustrialAsset]:
        return self.registry.get_asset(asset_id)

    def create_asset(self, req: AssetCreateRequest) -> IndustrialAsset:
        return self.registry.create_asset(req)

    def update_asset(self, asset_id: str, updates: AssetUpdateRequest) -> IndustrialAsset:
        return self.registry.update_asset(asset_id, updates)

    def set_maintenance(self, asset_id: str, is_active: bool, reason: Optional[str] = None) -> IndustrialAsset:
        return self.registry.set_maintenance_window(asset_id, is_active, reason)

    # --- Event & Correlation Operations ---
    def ingest_event(self, event_data: Dict[str, Any]) -> Optional[CorrelatedIncident]:
        return self.correlator.process_event(event_data)

    def list_incidents(self) -> List[CorrelatedIncident]:
        return self.correlator.list_incidents()

    def get_incident(self, incident_id: str) -> Optional[CorrelatedIncident]:
        return self.correlator.get_incident(incident_id)

    # --- Scoring & Assessment Operations ---
    def assess_event(
        self,
        security_severity: str,
        asset_id: Optional[str] = None,
        confidence: float = 65.0,
        event_data: Optional[Dict[str, Any]] = None,
    ) -> ImpactScoreResult:
        try:
            sec_sev = SecuritySeverity(security_severity.lower())
        except ValueError:
            sec_sev = SecuritySeverity.MEDIUM

        asset = self.registry.get_asset(asset_id) if asset_id else None
        is_maint = self.registry.is_in_maintenance(asset.asset_id) if asset else False

        return self.scorer.score(
            security_severity=sec_sev,
            asset=asset,
            confidence_score=confidence,
            event_data=event_data,
            is_corroborated=False,
            is_maintenance=is_maint,
        )

    # --- Explainability & Recommendations ---
    def get_incident_explanation(self, incident_id: str) -> Optional[IncidentExplanation]:
        inc = self.get_incident(incident_id)
        if not inc:
            return None
        return self.explainer.generate_explanation(inc)

    def get_incident_recommendations(self, incident_id: str) -> Optional[List[ResponseRecommendation]]:
        inc = self.get_incident(incident_id)
        if not inc:
            return None
        return self.recommender.generate_recommendations(inc)

    def record_decision(
        self,
        recommendation_id: str,
        decision: str,
        reviewer: str,
        reason: Optional[str] = None,
    ) -> ResponseRecommendation:
        return self.recommender.record_decision(recommendation_id, decision, reviewer, reason)


# Shared singleton instance
industrial_service = IndustrialIntelligenceService()
