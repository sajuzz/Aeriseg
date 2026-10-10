"""
Policy-Aware Industrial Response Recommendations Engine
---------------------------------------------------------
Generates safety-first, policy-gated mitigation recommendations.

Core Safety Principles:
1. Operational Continuity & Safety First: High-priority security alerts must
   NEVER automatically disrupt active industrial processes or trip PLCs.
2. Segregation of Disruption:
   - Diagnostic/investigative steps are non-disruptive (approval not required).
   - Containment actions (e.g. host isolation, IP blocking) are flagged as
     `is_disruptive = True` and require explicit human approval before simulation.
3. Zero Physical Risk: Uses an in-memory simulated connector only. No commands
   are ever transmitted to real physical networks or controllers.
"""

from typing import List, Dict, Optional
import uuid
import structlog

from app.industrial_intelligence.schemas import (
    CorrelatedIncident,
    ResponseRecommendation,
    ApprovalStatus,
    PurdueLevel,
)
from app.industrial_intelligence.asset_registry import asset_registry

log = structlog.get_logger()


class SimulatedIndustrialConnector:
    """
    Simulated containment connector for demonstration and testing.
    Records simulated firewall blocks or host quarantines safely in memory.
    """

    def __init__(self):
        self.simulated_blocked_ips: List[str] = []
        self.simulated_quarantined_hosts: List[str] = []
        self.execution_audit_log: List[Dict] = []

    def execute_action(self, action_type: str, target: str, approved_by: str) -> str:
        record = {
            "action_type": action_type,
            "target": target,
            "approved_by": approved_by,
            "simulated": True,
        }
        self.execution_audit_log.append(record)

        if action_type == "quarantine_host":
            self.simulated_quarantined_hosts.append(target)
            msg = f"Simulated Host Quarantine executed for '{target}' (Audit ID: {len(self.execution_audit_log)})."
        elif action_type == "block_network_path":
            self.simulated_blocked_ips.append(target)
            msg = f"Simulated Firewall Flow Block executed for IP '{target}' (Audit ID: {len(self.execution_audit_log)})."
        else:
            msg = f"Simulated custom containment executed for '{target}'."

        log.info("simulated_connector.executed", action=action_type, target=target, approved_by=approved_by)
        return msg


class IndustrialRecommendationEngine:
    def __init__(self):
        self.connector = SimulatedIndustrialConnector()
        self._active_recommendations: Dict[str, ResponseRecommendation] = {}

    def generate_recommendations(self, incident: CorrelatedIncident) -> List[ResponseRecommendation]:
        """
        Generates context-aware recommendations for a given incident.
        """
        recs: List[ResponseRecommendation] = []
        primary_asset = asset_registry.get_asset(incident.primary_asset_id)

        # 1. Non-disruptive triage recommendation (always present)
        rec_triage = ResponseRecommendation(
            recommendation_id=f"REC-{uuid.uuid4().hex[:6].upper()}",
            action_type="investigate_process_tree",
            title="Inspect Workstation Process Tree & Memory Artifacts",
            description=(
                "Collect live process list and command history from the initiating host without restarting or isolating. "
                "Look for unauthorized scripting hosts (PowerShell, Python, wscript)."
            ),
            target_asset_id=incident.primary_asset_id,
            target_ip=primary_asset.ip_address if primary_asset else None,
            is_disruptive=False,
            requires_human_approval=False,
            approval_status=ApprovalStatus.NOT_REQUIRED,
            safety_rationale="Passive forensic artifact collection will not impact manufacturing line speed or control loops.",
        )
        recs.append(rec_triage)

        # 2. Plant Engineer Coordination recommendation
        rec_engineer = ResponseRecommendation(
            recommendation_id=f"REC-{uuid.uuid4().hex[:6].upper()}",
            action_type="consult_ot_engineer",
            title="Consult Designated Automation Engineer",
            description=(
                f"Notify {primary_asset.owner_team if primary_asset else 'Plant OT Lead'} to confirm whether current "
                "activity corresponds with an authorized work permit or unannounced maintenance task."
            ),
            target_asset_id=incident.primary_asset_id,
            target_ip=primary_asset.ip_address if primary_asset else None,
            is_disruptive=False,
            requires_human_approval=False,
            approval_status=ApprovalStatus.NOT_REQUIRED,
            safety_rationale="Human operational validation prevents false-positive production interruptions.",
        )
        recs.append(rec_engineer)

        # 3. Network Path Validation
        rec_net = ResponseRecommendation(
            recommendation_id=f"REC-{uuid.uuid4().hex[:6].upper()}",
            action_type="validate_acl_rules",
            title="Audit Industrial Firewall Segmentation Rules",
            description=(
                "Verify whether the industrial firewall ACL permits direct communication from "
                f"source segment to {primary_asset.network_segment if primary_asset else 'OT VLAN'}."
            ),
            target_asset_id=incident.primary_asset_id,
            target_ip=primary_asset.ip_address if primary_asset else None,
            is_disruptive=False,
            requires_human_approval=False,
            approval_status=ApprovalStatus.NOT_REQUIRED,
            safety_rationale="Passive configuration review has zero operational side-effects.",
        )
        recs.append(rec_net)

        # 4. Containment Actions (Only suggested if priority is high/critical or cross-zone pivot detected)
        if incident.impact_assessment.priority_score >= 60.0 or incident.cross_zone_pivot:
            # Disruptive Host Quarantine (Requires Approval)
            rec_quarantine = ResponseRecommendation(
                recommendation_id=f"REC-{uuid.uuid4().hex[:6].upper()}",
                action_type="quarantine_host",
                title="Simulated Host Isolation (Engineering Workstation)",
                description=(
                    "Sever network connectivity on the compromised engineering workstation to prevent further "
                    "downstream command transmission into the OT control network."
                ),
                target_asset_id=incident.primary_asset_id,
                target_ip=primary_asset.ip_address if primary_asset else None,
                is_disruptive=True,
                requires_human_approval=True,
                approval_status=ApprovalStatus.PENDING,
                safety_rationale=(
                    "Disruptive action: Isolating an engineering workstation prevents ongoing PLC programming "
                    "but does NOT halt running PLCs. Requires explicit SOC Manager or OT Lead authorization."
                ),
            )
            recs.append(rec_quarantine)

            # Disruptive Traffic Block (Requires Approval)
            if primary_asset and primary_asset.purdue_level in [PurdueLevel.LEVEL_1, PurdueLevel.LEVEL_2]:
                rec_block = ResponseRecommendation(
                    recommendation_id=f"REC-{uuid.uuid4().hex[:6].upper()}",
                    action_type="block_network_path",
                    title="Simulated Flow Block: Engineering VLAN -> PLC Subnet",
                    description=(
                        f"Insert temporary block rule at the industrial perimeter firewall for destination {primary_asset.ip_address}. "
                        "Terminates remote connection attempts while keeping PLC running local logic."
                    ),
                    target_asset_id=primary_asset.asset_id,
                    target_ip=primary_asset.ip_address,
                    is_disruptive=True,
                    requires_human_approval=True,
                    approval_status=ApprovalStatus.PENDING,
                    safety_rationale=(
                        "Safety Warning: Blocking supervisory network flows can blind SCADA monitors. "
                        "Mandates human sign-off from Plant Operations."
                    ),
                )
                recs.append(rec_block)

        # Index recommendations
        for r in recs:
            self._active_recommendations[r.recommendation_id] = r

        return recs

    def get_recommendation(self, rec_id: str) -> Optional[ResponseRecommendation]:
        return self._active_recommendations.get(rec_id)

    def record_decision(
        self,
        recommendation_id: str,
        decision: str,
        reviewer: str,
        reason: Optional[str] = None,
    ) -> ResponseRecommendation:
        """
        Records human approval decision on a response recommendation.
        If APPROVED, executes simulated containment safely.
        """
        rec = self.get_recommendation(recommendation_id)
        if not rec:
            raise KeyError(f"Recommendation '{recommendation_id}' not found")

        decision_upper = decision.upper()
        if decision_upper == "APPROVED":
            rec.approval_status = ApprovalStatus.APPROVED
            # Execute simulated containment
            target_str = rec.target_ip or rec.target_asset_id
            sim_result = self.connector.execute_action(rec.action_type, target_str, reviewer)
            rec.simulated_execution_status = sim_result
            rec.approval_status = ApprovalStatus.EXECUTED
        elif decision_upper == "REJECTED":
            rec.approval_status = ApprovalStatus.REJECTED
            rec.simulated_execution_status = f"Containment rejected by reviewer '{reviewer}'. Reason: {reason or 'No reason provided'}."
        else:
            raise ValueError(f"Invalid decision '{decision}'. Must be APPROVED or REJECTED.")

        log.info(
            "recommendation.decision_recorded",
            rec_id=recommendation_id,
            status=rec.approval_status.value,
            reviewer=reviewer,
        )
        return rec


# Singleton recommendation engine
recommendation_engine = IndustrialRecommendationEngine()
