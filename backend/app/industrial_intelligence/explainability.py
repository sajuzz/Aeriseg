"""
Explainable Industrial Incident Report Generator
------------------------------------------------
Produces transparent, deterministic, evidence-traceable incident reports.
Every statement is strictly anchored in observed telemetry, asset metadata,
or deterministic risk calculations. Facts are cleanly separated from hypotheses.

Google Gemini AI Integration:
Includes an optional Google Gemini copilot module (`GeminiIndustrialCopilot`)
for natural-language operational impact synthesis when GEMINI_API_KEY is configured.
Falls back seamlessly to the deterministic template engine when offline or unconfigured.
"""

from typing import Dict, Any, List, Optional
import os
import json
import urllib.request
import urllib.error
import structlog

from app.industrial_intelligence.schemas import (
    CorrelatedIncident,
    IncidentExplanation,
    IndustrialAsset,
)
from app.industrial_intelligence.asset_registry import asset_registry

log = structlog.get_logger()


from app.core.config import settings

class GeminiIndustrialCopilot:
    """
    Focused Google Gemini client for industrial incident synthesis.
    Works with Google AI Studio free tier via standard HTTPS REST request.
    Security Architecture:
    - Transmits credentials via encrypted 'x-goog-api-key' HTTP header (never in URL query string)
    - Automatically redacts API keys from all error logs and diagnostic traces
    - Reads from protected .env via Pydantic settings
    """

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = (
            api_key
            or getattr(settings, "GEMINI_API_KEY", "")
            or os.environ.get("GEMINI_API_KEY")
            or os.environ.get("GOOGLE_API_KEY")
            or ""
        ).strip()
        self.model = (
            model
            or getattr(settings, "GEMINI_MODEL", "")
            or os.environ.get("GEMINI_MODEL")
            or "gemini-flash-latest"
        ).strip()

    def is_available(self) -> bool:
        return bool(self.api_key and len(self.api_key) > 5)

    def get_masked_key(self) -> str:
        """Returns safe masked key for audit/diagnostics without exposing secret."""
        if not self.is_available():
            return "NOT_CONFIGURED"
        if len(self.api_key) <= 8:
            return "********"
        return f"{self.api_key[:4]}...{self.api_key[-4:]}"

    def analyze_incident(
        self,
        incident_data: Dict[str, Any],
        facts: Optional[List[str]] = None,
        hypotheses: Optional[List[str]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Calls Google Gemini to provide structured operational impact insights.
        Returns None if API key is not configured or network request fails.
        """
        if not self.is_available():
            return None

        facts = facts or []
        hypotheses = hypotheses or []

        # Secure: Endpoint contains NO API key query parameter
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        prompt = (
            "You are an expert Industrial Cybersecurity & Operational Continuity Copilot. "
            "Analyze the following correlated industrial incident evidence strictly based on observed facts. "
            "Do NOT hallucinate malware names, breach extent, or production damages not proven in the telemetry.\n\n"
            f"INCIDENT: {json.dumps(incident_data, default=str)}\n"
            f"OBSERVED FACTS: {json.dumps(facts)}\n"
            f"TECHNICAL HYPOTHESES: {json.dumps(hypotheses)}\n\n"
            "Return a concise JSON object with exactly the following keys:\n"
            "- 'executive_summary': A 2-sentence summary of the observed activity and affected production line\n"
            "- 'operational_risk_assessment': Potential impact on manufacturing uptime and safety\n"
            "- 'ot_engineer_briefing': Clear briefing points for the plant floor OT engineer\n"
            "- 'priority_recommendation': The top immediate verification action\n"
        )

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"}
        }

        try:
            req = urllib.request.Request(
                endpoint,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": self.api_key,  # Sent via encrypted HTTP header
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text)
        except Exception as e:
            # Redact any accidental credential echo from error trace
            err_msg = str(e)
            if self.api_key:
                err_msg = err_msg.replace(self.api_key, "[REDACTED_GEMINI_KEY]")
            log.warning("gemini_copilot.call_failed", error=err_msg, model=self.model)
            return None


class IndustrialExplainabilityEngine:
    def __init__(self):
        self.gemini = GeminiIndustrialCopilot()

    def generate_explanation(self, incident: CorrelatedIncident) -> IncidentExplanation:
        """
        Generates a comprehensive, evidence-backed explanation report for an industrial incident.
        """
        # Resolve all affected assets
        assets: List[IndustrialAsset] = []
        for aid in incident.affected_assets:
            a = asset_registry.get_asset(aid)
            if a:
                assets.append(a)

        # 1. Facts Observed (strictly traceable to events and asset records)
        facts: List[str] = []
        facts.append(
            f"Detected {incident.event_count} telemetry event(s) across {len(incident.affected_assets)} asset(s) "
            f"between {incident.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')} and {incident.updated_at.strftime('%Y-%m-%d %H:%M:%S UTC')}."
        )

        for e in incident.events:
            src = e.get("source_ip", "Unknown")
            dst = e.get("dest_ip", "Unknown")
            rule = e.get("rule_id", "Generic")
            msg = e.get("message", "Telemetry match")
            proc = e.get("process_name") or e.get("command_line")
            user = e.get("user") or e.get("account")
            fact_line = f"Event '{rule}' logged from {src} to {dst}: \"{msg}\""
            if proc:
                fact_line += f" (Process: {proc})"
            if user:
                fact_line += f" (Account: {user})"
            facts.append(fact_line)

        for a in assets:
            facts.append(
                f"Asset Record {a.asset_id} ({a.name}): Purdue Level {a.purdue_level.value}, "
                f"Zone: '{a.production_zone}', Network: '{a.network_segment}', Criticality: {a.criticality.value.upper()}."
            )

        # 2. Hypotheses & Potential Consequences (clearly marked as possibilities)
        hypotheses: List[str] = []
        if incident.cross_zone_pivot:
            hypotheses.append(
                "Possibility: Unauthorized lateral movement traversing from an engineering or IT workstation into supervisory/control OT networks."
            )

        for a in assets:
            if a.purdue_level in [a.purdue_level.LEVEL_1, a.purdue_level.LEVEL_2]:
                hypotheses.append(
                    f"Potential Consequence: Disruption of {a.name} could affect '{a.operational_importance}'. (Hypothetical, no physical trip currently observed)."
                )

        if incident.impact_assessment.is_maintenance_suppressed:
            hypotheses.append(
                "Possibility: Observed behavior may correlate with authorized diagnostic or maintenance tasks scheduled during this window."
            )

        # 3. Missing Evidence & Uncertainty
        missing: List[str] = list(incident.impact_assessment.uncertainty_factors)
        missing.append("Confirmation from plant controls engineer whether this communication was authorized during the current shift.")
        missing.append("Process memory validation to confirm whether commands originated from interactive console or automated software.")

        # 4. Recommended Investigation Steps
        steps: List[str] = [
            f"1. Contact the designated asset owner ({', '.join(a.owner_team for a in assets)}) to verify authorized activity.",
            "2. Inspect the engineering workstation process tree and command history around the alert timestamp.",
            "3. Verify industrial network firewall logs between engineering VLAN and OT control VLAN.",
            "4. Review the current plant maintenance window calendar and active shift permits.",
            "5. If unapproved, request authorized containment approval via the SOC response workflow.",
        ]

        # 5. Gemini AI Analysis (if configured, else deterministic fallback)
        ai_assessment = self.gemini.analyze_incident(
            incident_data={
                "incident_id": incident.incident_id,
                "title": incident.title,
                "priority_score": incident.impact_assessment.priority_score,
                "manufacturing_impact_score": incident.impact_assessment.potential_manufacturing_impact_score,
                "rules": incident.rules_triggered,
                "affected_assets": [a.name for a in assets],
            },
            facts=facts,
            hypotheses=hypotheses,
        )

        if not ai_assessment:
            # Deterministic fallback operational assessment
            ai_assessment = {
                "engine": "AeriSeg Deterministic Rule-Based Synthesis (Offline Mode)",
                "executive_summary": (
                    f"Correlated incident {incident.incident_id} involving {len(assets)} asset(s) on "
                    f"{assets[0].site if assets else 'Manufacturing Floor'}. "
                    f"Overall priority score is {incident.impact_assessment.priority_score}/100."
                ),
                "operational_risk_assessment": (
                    f"Manufacturing impact potential evaluated at {incident.impact_assessment.potential_manufacturing_impact_score}/100. "
                    f"Cross-zone pivot status: {incident.cross_zone_pivot}."
                ),
                "ot_engineer_briefing": (
                    f"Review network connectivity to {', '.join(a.name for a in assets)}. "
                    "Confirm if authorized work orders correspond with the observed activity."
                ),
                "priority_recommendation": "Validate engineering workstation process execution with shift automation lead.",
            }

        summary = (
            f"Industrial Security Incident {incident.incident_id}: "
            f"{incident.title}. Priority Score: {incident.impact_assessment.priority_score}/100. "
            f"Security Severity: {incident.impact_assessment.security_severity.value.upper()}. "
            f"Potential Manufacturing Impact: {incident.impact_assessment.potential_manufacturing_impact_score}/100."
        )

        return IncidentExplanation(
            incident_id=incident.incident_id,
            summary=summary,
            affected_assets=assets,
            event_timeline=incident.timeline,
            rules_triggered=incident.rules_triggered,
            supporting_evidence=incident.impact_assessment.contributing_evidence,
            correlation_rationale=incident.correlation_rationale,
            security_severity=incident.impact_assessment.security_severity,
            detection_confidence=incident.impact_assessment.confidence_score,
            manufacturing_impact_score=incident.impact_assessment.potential_manufacturing_impact_score,
            overall_priority_score=incident.impact_assessment.priority_score,
            facts_observed=facts,
            hypotheses_and_possibilities=hypotheses,
            missing_evidence_and_uncertainty=missing,
            ai_operational_assessment=ai_assessment,
            recommended_investigation_steps=steps,
        )


# Singleton explainability engine
explainability_engine = IndustrialExplainabilityEngine()
