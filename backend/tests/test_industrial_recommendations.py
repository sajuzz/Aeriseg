import pytest
from datetime import datetime, timezone
from app.industrial_intelligence.schemas import (
    CorrelatedIncident,
    ImpactScoreResult,
    SecuritySeverity,
    AssetCriticality,
    ApprovalStatus,
)
from app.industrial_intelligence.explainability import IndustrialExplainabilityEngine
from app.industrial_intelligence.recommendations import IndustrialRecommendationEngine


@pytest.fixture
def sample_incident():
    score = ImpactScoreResult(
        priority_score=78.5,
        security_severity=SecuritySeverity.HIGH,
        asset_criticality=AssetCriticality.CRITICAL,
        confidence_score=75.0,
        evidence_strength_score=80.0,
        potential_manufacturing_impact_score=90.0,
        corroboration_bonus=10.0,
        scoring_formula_explanation="Test formula",
        contributing_evidence=["Source IP 192.168.20.15", "Dest IP 10.10.100.51"],
        uncertainty_factors=["Missing command payload"],
    )

    return CorrelatedIncident(
        incident_id="IND-INC-TEST01",
        title="Cross-Zone Engineering to PLC Connection",
        created_at=datetime(2026, 10, 10, 14, 0, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 10, 10, 14, 2, 0, tzinfo=timezone.utc),
        affected_assets=["IND-ENG-01", "IND-PLC-101"],
        primary_asset_id="IND-PLC-101",
        event_count=2,
        events=[
            {"source_ip": "192.168.20.15", "dest_ip": "192.168.20.15", "rule_id": "RULE-1", "message": "Powershell"},
            {"source_ip": "192.168.20.15", "dest_ip": "10.10.100.51", "rule_id": "RULE-2", "message": "S7comm write"},
        ],
        timeline=[
            {"timestamp": "2026-10-10T14:00:00Z", "rule_id": "RULE-1", "summary": "Powershell"},
            {"timestamp": "2026-10-10T14:02:00Z", "rule_id": "RULE-2", "summary": "S7comm write"},
        ],
        rules_triggered=["RULE-1", "RULE-2"],
        correlation_rationale="Cross-zone pivot confirmed",
        cross_zone_pivot=True,
        impact_assessment=score,
        status="OPEN",
    )


def test_explainability_report_traceability(sample_incident):
    explainer = IndustrialExplainabilityEngine()
    report = explainer.generate_explanation(sample_incident)

    assert report.incident_id == "IND-INC-TEST01"
    assert report.overall_priority_score == 78.5
    assert len(report.facts_observed) >= 3

    # Hypotheses must be distinguished from facts
    assert len(report.hypotheses_and_possibilities) >= 1
    assert any("Possibility:" in h or "Potential Consequence:" in h for h in report.hypotheses_and_possibilities)

    # Uncertainty factors must be tracked
    assert len(report.missing_evidence_and_uncertainty) >= 1

    # AI Assessment fallback must be present and structured
    assert report.ai_operational_assessment is not None
    assert "executive_summary" in report.ai_operational_assessment


def test_recommendations_and_approval_gates(sample_incident):
    rec_engine = IndustrialRecommendationEngine()
    recs = rec_engine.generate_recommendations(sample_incident)

    assert len(recs) >= 3

    # Check non-disruptive vs disruptive split
    non_disruptive = [r for r in recs if not r.is_disruptive]
    disruptive = [r for r in recs if r.is_disruptive]

    assert len(non_disruptive) >= 2
    for nd in non_disruptive:
        assert nd.requires_human_approval is False
        assert nd.approval_status == ApprovalStatus.NOT_REQUIRED

    assert len(disruptive) >= 1
    for d in disruptive:
        assert d.requires_human_approval is True
        assert d.approval_status == ApprovalStatus.PENDING

    # Test approval workflow execution
    target_rec = disruptive[0]
    approved_rec = rec_engine.record_decision(
        recommendation_id=target_rec.recommendation_id,
        decision="APPROVED",
        reviewer="OT_Lead_Bob",
    )

    assert approved_rec.approval_status == ApprovalStatus.EXECUTED
    assert "Simulated" in approved_rec.simulated_execution_status
    assert len(rec_engine.connector.execution_audit_log) == 1
