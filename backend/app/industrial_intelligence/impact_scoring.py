"""
Manufacturing Impact Scoring Engine
------------------------------------
Deterministic, explainable, and mathematically reproducible risk scoring
designed for industrial manufacturing environments.

Formula & Design Principles:
1. Security Severity and Asset Criticality are strictly separated.
2. High asset criticality inflates potential operational impact, but does NOT
   fabricate false certainty of an attack without concrete detection confidence.
3. Every numeric score is bounded in [0.0, 100.0].
4. Missing context and active maintenance windows explicitly factor into
   uncertainty indicators and score suppression.
"""

from typing import Dict, Any, List, Optional
import structlog

from app.industrial_intelligence.schemas import (
    IndustrialAsset,
    AssetCriticality,
    PurdueLevel,
    SecuritySeverity,
    ImpactScoreResult,
)

log = structlog.get_logger()

# Severity to numeric score (0-100)
SEVERITY_SCORES: Dict[SecuritySeverity, float] = {
    SecuritySeverity.LOW: 25.0,
    SecuritySeverity.MEDIUM: 50.0,
    SecuritySeverity.HIGH: 75.0,
    SecuritySeverity.CRITICAL: 100.0,
}

# Asset Criticality to numeric score (0-100)
CRITICALITY_SCORES: Dict[AssetCriticality, float] = {
    AssetCriticality.LOW: 20.0,
    AssetCriticality.MEDIUM: 50.0,
    AssetCriticality.HIGH: 80.0,
    AssetCriticality.CRITICAL: 100.0,
}

# Purdue Level Multipliers for operational impact
PURDUE_IMPACT_MULTIPLIERS: Dict[PurdueLevel, float] = {
    PurdueLevel.LEVEL_0: 1.00,  # Physical Process
    PurdueLevel.LEVEL_1: 1.00,  # Basic Control / PLCs
    PurdueLevel.LEVEL_2: 0.90,  # Supervisory / SCADA / HMI
    PurdueLevel.LEVEL_3: 0.75,  # Operations / DMZ / Historian
    PurdueLevel.LEVEL_4: 0.35,  # Enterprise IT
}


class ManufacturingImpactScorer:
    """
    Deterministic scoring engine.
    Weights are configurable and transparent.
    """

    def __init__(
        self,
        weight_severity: float = 0.35,
        weight_criticality: float = 0.25,
        weight_confidence: float = 0.25,
        weight_evidence: float = 0.15,
        corroboration_bonus: float = 10.0,
        maintenance_suppression_factor: float = 0.40,
    ):
        self.w_sec = weight_severity
        self.w_crit = weight_criticality
        self.w_conf = weight_confidence
        self.w_evid = weight_evidence
        self.corroboration_bonus_val = corroboration_bonus
        self.maintenance_factor = maintenance_suppression_factor

    def calculate_evidence_strength(self, event_data: Dict[str, Any]) -> tuple[float, List[str], List[str]]:
        """
        Calculates evidence strength (0-100) based on presence of verifiable fields.
        Returns (strength_score, contributing_evidence, uncertainty_factors).
        """
        contributing: List[str] = []
        uncertainties: List[str] = []
        points = 0.0

        # Check concrete forensic fields
        if event_data.get("source_ip"):
            points += 15.0
            contributing.append(f"Source IP identified: {event_data['source_ip']}")
        else:
            uncertainties.append("Missing source IP address")

        if event_data.get("dest_ip"):
            points += 15.0
            contributing.append(f"Destination IP identified: {event_data['dest_ip']}")
        else:
            uncertainties.append("Missing destination IP address")

        if event_data.get("process_name") or event_data.get("command_line"):
            points += 25.0
            proc = event_data.get("process_name") or event_data.get("command_line")
            contributing.append(f"Process execution trace captured: {proc}")
        else:
            uncertainties.append("No process execution or binary command-line artifact")

        if event_data.get("user") or event_data.get("account"):
            points += 15.0
            user = event_data.get("user") or event_data.get("account")
            contributing.append(f"Originating user account recorded: {user}")
        else:
            uncertainties.append("Unauthenticated or service-level connection (no user attribution)")

        if event_data.get("payload_snippet") or event_data.get("network_bytes") or event_data.get("function_code"):
            points += 20.0
            contributing.append("Deep inspection data present (payload bytes or industrial function code)")
        else:
            uncertainties.append("Payload or industrial protocol body not deeply inspected")

        if event_data.get("timestamp"):
            points += 10.0
            contributing.append(f"Authoritative timestamp: {event_data['timestamp']}")

        strength = min(100.0, max(0.0, points))
        return strength, contributing, uncertainties

    def score(
        self,
        security_severity: SecuritySeverity,
        asset: Optional[IndustrialAsset],
        confidence_score: float,
        event_data: Optional[Dict[str, Any]] = None,
        is_corroborated: bool = False,
        is_maintenance: bool = False,
    ) -> ImpactScoreResult:
        """
        Executes deterministic impact calculation.
        """
        event_data = event_data or {}
        confidence_clamped = min(100.0, max(0.0, float(confidence_score)))
        sec_score = SEVERITY_SCORES.get(security_severity, 50.0)

        # Asset criticality defaults to MEDIUM if asset is unknown
        asset_crit = asset.criticality if asset else AssetCriticality.MEDIUM
        crit_score = CRITICALITY_SCORES.get(asset_crit, 50.0)

        # Potential manufacturing impact calculation
        purdue_level = asset.purdue_level if asset else PurdueLevel.LEVEL_3
        purdue_mult = PURDUE_IMPACT_MULTIPLIERS.get(purdue_level, 0.75)
        mfg_impact_score = round(crit_score * purdue_mult, 1)

        # Evidence evaluation
        evid_score, contributing, uncertainties = self.calculate_evidence_strength(event_data)

        # Add asset-specific context to contributing evidence
        if asset:
            contributing.append(
                f"Asset: {asset.name} ({asset.asset_id}) [Zone: {asset.production_zone}, Purdue: {asset.purdue_level.value}]"
            )
            contributing.append(f"Operational context: {asset.operational_importance}")
        else:
            uncertainties.append("Asset not registered in industrial registry; assumed default medium criticality")

        # Corroboration calculation
        bonus = self.corroboration_bonus_val if is_corroborated else 0.0
        if is_corroborated:
            contributing.append(f"Multi-event corroboration applied (+{self.corroboration_bonus_val} pts)")

        # Weighted calculation
        raw_score = (
            (self.w_sec * sec_score) +
            (self.w_crit * crit_score) +
            (self.w_conf * confidence_clamped) +
            (self.w_evid * evid_score) +
            bonus
        )

        # Maintenance window dampening
        suppressed = False
        if is_maintenance:
            raw_score *= self.maintenance_factor
            suppressed = True
            contributing.append(
                f"Active maintenance window detected; priority dampened by {int((1 - self.maintenance_factor) * 100)}%"
            )

        final_priority = round(min(100.0, max(0.0, raw_score)), 1)

        # Detailed mathematical explanation
        formula_explanation = (
            f"Priority Score ({final_priority}/100) = "
            f"({self.w_sec} * Severity[{sec_score}]) + "
            f"({self.w_crit} * Criticality[{crit_score}]) + "
            f"({self.w_conf} * Confidence[{confidence_clamped}]) + "
            f"({self.w_evid} * Evidence[{evid_score}])"
        )
        if bonus > 0:
            formula_explanation += f" + Corroboration[{bonus}]"
        if suppressed:
            formula_explanation += f" * MaintenanceDampener[{self.maintenance_factor}]"

        formula_explanation += f". Potential Manufacturing Impact: {mfg_impact_score}/100."

        return ImpactScoreResult(
            priority_score=final_priority,
            security_severity=security_severity,
            asset_criticality=asset_crit,
            confidence_score=confidence_clamped,
            evidence_strength_score=evid_score,
            potential_manufacturing_impact_score=mfg_impact_score,
            corroboration_bonus=bonus,
            is_maintenance_suppressed=suppressed,
            scoring_formula_explanation=formula_explanation,
            contributing_evidence=contributing,
            uncertainty_factors=uncertainties,
        )


# Singleton scorer instance
impact_scorer = ManufacturingImpactScorer()
