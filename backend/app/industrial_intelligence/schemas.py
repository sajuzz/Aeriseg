from __future__ import annotations

from enum import Enum
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class AssetType(str, Enum):
    ENGINEERING_WORKSTATION = "engineering_workstation"
    PLC_CONTROLLER = "plc_controller"
    SCADA_SERVER = "scada_server"
    HMI_WORKSTATION = "hmi_workstation"
    INDUSTRIAL_HISTORIAN = "industrial_historian"
    MANUFACTURING_APP_SERVER = "manufacturing_app_server"
    IT_WORKSTATION = "it_workstation"


class AssetCriticality(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class PurdueLevel(str, Enum):
    LEVEL_0 = "level_0"  # Physical Process / Field instrumentation
    LEVEL_1 = "level_1"  # Basic Control (PLCs, RTUs, drives)
    LEVEL_2 = "level_2"  # Area Supervisory Control (SCADA, HMIs)
    LEVEL_3 = "level_3"  # Site Operations / Industrial DMZ (Historians, Eng Workstations)
    LEVEL_4 = "level_4"  # Enterprise IT Network (ERP, Business Workstations)


class SecuritySeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class DetectionConfidence(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ApprovalStatus(str, Enum):
    NOT_REQUIRED = "not_required"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXECUTED = "executed"


class MaintenanceWindow(BaseModel):
    is_active: bool = False
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class IndustrialAsset(BaseModel):
    asset_id: str = Field(..., description="Unique alphanumeric identifier e.g. IND-PLC-101")
    name: str = Field(..., description="Human-readable asset name")
    asset_type: AssetType
    purdue_level: PurdueLevel
    ip_address: str = Field(..., description="Asset network IP address")
    site: str = Field(..., description="Manufacturing facility / plant name")
    production_zone: str = Field(..., description="Specific production hall or segment e.g. Assembly Line 1")
    network_segment: str = Field(..., description="VLAN / subnet label e.g. OT-VLAN-100")
    criticality: AssetCriticality = Field(..., description="Operational importance level")
    operational_importance: str = Field(..., description="Explanation of manufacturing impact if asset fails")
    associated_systems: List[str] = Field(default_factory=list, description="IDs of linked assets or dependencies")
    owner_team: str = Field(..., description="Responsible OT / engineering team")
    maintenance_window: Optional[MaintenanceWindow] = None
    is_enabled: bool = True
    tags: List[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class AssetCreateRequest(BaseModel):
    asset_id: str
    name: str
    asset_type: AssetType
    purdue_level: PurdueLevel
    ip_address: str
    site: str
    production_zone: str
    network_segment: str
    criticality: AssetCriticality
    operational_importance: str
    associated_systems: List[str] = []
    owner_team: str
    maintenance_window: Optional[MaintenanceWindow] = None
    is_enabled: bool = True
    tags: List[str] = []


class AssetUpdateRequest(BaseModel):
    name: Optional[str] = None
    asset_type: Optional[AssetType] = None
    purdue_level: Optional[PurdueLevel] = None
    ip_address: Optional[str] = None
    site: Optional[str] = None
    production_zone: Optional[str] = None
    network_segment: Optional[str] = None
    criticality: Optional[AssetCriticality] = None
    operational_importance: Optional[str] = None
    associated_systems: Optional[List[str]] = None
    owner_team: Optional[str] = None
    maintenance_window: Optional[MaintenanceWindow] = None
    is_enabled: Optional[bool] = None
    tags: Optional[List[str]] = None


class ImpactScoreResult(BaseModel):
    priority_score: float = Field(..., ge=0.0, le=100.0, description="Normalized overall priority (0-100)")
    security_severity: SecuritySeverity
    asset_criticality: AssetCriticality
    confidence_score: float = Field(..., ge=0.0, le=100.0)
    evidence_strength_score: float = Field(..., ge=0.0, le=100.0)
    potential_manufacturing_impact_score: float = Field(..., ge=0.0, le=100.0)
    corroboration_bonus: float = Field(default=0.0)
    is_maintenance_suppressed: bool = False
    scoring_formula_explanation: str
    contributing_evidence: List[str] = Field(default_factory=list)
    uncertainty_factors: List[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class CorrelatedIncident(BaseModel):
    incident_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    affected_assets: List[str]
    primary_asset_id: str
    event_count: int
    events: List[Dict[str, Any]]
    timeline: List[Dict[str, Any]]
    rules_triggered: List[str]
    correlation_rationale: str
    cross_zone_pivot: bool
    impact_assessment: ImpactScoreResult
    status: str = "OPEN"

    model_config = ConfigDict(from_attributes=True)


class IncidentExplanation(BaseModel):
    incident_id: str
    summary: str
    affected_assets: List[IndustrialAsset]
    event_timeline: List[Dict[str, Any]]
    rules_triggered: List[str]
    supporting_evidence: List[str]
    correlation_rationale: str
    security_severity: SecuritySeverity
    detection_confidence: float
    manufacturing_impact_score: float
    overall_priority_score: float
    facts_observed: List[str]
    hypotheses_and_possibilities: List[str]
    missing_evidence_and_uncertainty: List[str]
    ai_operational_assessment: Optional[Dict[str, Any]] = None
    recommended_investigation_steps: List[str]

    model_config = ConfigDict(from_attributes=True)


class ResponseRecommendation(BaseModel):
    recommendation_id: str
    action_type: str
    title: str
    description: str
    target_asset_id: str
    target_ip: Optional[str] = None
    is_disruptive: bool = False
    requires_human_approval: bool = True
    approval_status: ApprovalStatus = ApprovalStatus.PENDING
    safety_rationale: str
    simulated_execution_status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ApprovalDecisionRequest(BaseModel):
    decision: str = Field(..., description="APPROVED or REJECTED")
    reviewer: str
    reason: Optional[str] = None
