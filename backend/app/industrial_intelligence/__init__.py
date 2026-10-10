"""
AeriSeg Industrial Security Intelligence Module
------------------------------------------------
Provides asset context, deterministic risk & manufacturing impact scoring,
cross-zone IT/OT event correlation, explainable incident generation,
and policy-aware response recommendations for industrial environments.
"""

from app.industrial_intelligence.schemas import (
    IndustrialAsset,
    AssetType,
    AssetCriticality,
    PurdueLevel,
    MaintenanceWindow,
    ImpactScoreResult,
    CorrelatedIncident,
    IncidentExplanation,
    ResponseRecommendation,
)

__all__ = [
    "IndustrialAsset",
    "AssetType",
    "AssetCriticality",
    "PurdueLevel",
    "MaintenanceWindow",
    "ImpactScoreResult",
    "CorrelatedIncident",
    "IncidentExplanation",
    "ResponseRecommendation",
]
