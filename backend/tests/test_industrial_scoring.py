import pytest
from app.industrial_intelligence.impact_scoring import ManufacturingImpactScorer
from app.industrial_intelligence.schemas import (
    IndustrialAsset,
    AssetType,
    AssetCriticality,
    PurdueLevel,
    SecuritySeverity,
)


@pytest.fixture
def scorer():
    return ManufacturingImpactScorer()


@pytest.fixture
def critical_plc():
    return IndustrialAsset(
        asset_id="IND-PLC-101",
        name="Main Drive PLC",
        asset_type=AssetType.PLC_CONTROLLER,
        purdue_level=PurdueLevel.LEVEL_1,
        ip_address="10.10.100.51",
        site="Detroit Plant 01",
        production_zone="Assembly Line 1",
        network_segment="OT-VLAN-110",
        criticality=AssetCriticality.CRITICAL,
        operational_importance="Direct manufacturing bottleneck",
        owner_team="Controls Engineering",
    )


@pytest.fixture
def low_it_asset():
    return IndustrialAsset(
        asset_id="IND-IT-01",
        name="Procurement PC",
        asset_type=AssetType.IT_WORKSTATION,
        purdue_level=PurdueLevel.LEVEL_4,
        ip_address="192.168.10.45",
        site="Detroit Plant 01",
        production_zone="Admin Building",
        network_segment="IT-VLAN-10",
        criticality=AssetCriticality.LOW,
        operational_importance="General office workstation",
        owner_team="IT Support",
    )


def test_score_boundaries(scorer, critical_plc):
    # Minimum possible parameters
    res_min = scorer.score(
        security_severity=SecuritySeverity.LOW,
        asset=None,
        confidence_score=0.0,
        event_data={},
    )
    assert 0.0 <= res_min.priority_score <= 100.0
    assert 0.0 <= res_min.potential_manufacturing_impact_score <= 100.0

    # Maximum possible parameters with corroboration
    res_max = scorer.score(
        security_severity=SecuritySeverity.CRITICAL,
        asset=critical_plc,
        confidence_score=100.0,
        event_data={
            "source_ip": "1.1.1.1",
            "dest_ip": "10.10.100.51",
            "process_name": "malicious.exe",
            "user": "root",
            "payload_snippet": "STOP_PLC_0x05",
            "timestamp": "2026-10-10T12:00:00Z",
        },
        is_corroborated=True,
    )
    assert res_max.priority_score <= 100.0
    assert res_max.priority_score > 90.0
    assert res_max.potential_manufacturing_impact_score == 100.0


def test_criticality_influences_impact_not_certainty(scorer, critical_plc, low_it_asset):
    # Same identical detection and evidence against two different assets
    identical_event = {
        "source_ip": "192.168.20.15",
        "dest_ip": "10.10.100.51",
        "command_line": "powershell -enc ...",
        "timestamp": "2026-10-10T12:00:00Z",
    }
    confidence = 65.0

    score_plc = scorer.score(
        security_severity=SecuritySeverity.HIGH,
        asset=critical_plc,
        confidence_score=confidence,
        event_data=identical_event,
    )

    score_it = scorer.score(
        security_severity=SecuritySeverity.HIGH,
        asset=low_it_asset,
        confidence_score=confidence,
        event_data=identical_event,
    )

    # Both must preserve identical detection confidence
    assert score_plc.confidence_score == score_it.confidence_score == confidence

    # Evidence strength must be identical
    assert score_plc.evidence_strength_score == score_it.evidence_strength_score

    # Manufacturing impact must be significantly higher for the PLC
    assert score_plc.potential_manufacturing_impact_score > score_it.potential_manufacturing_impact_score
    assert score_plc.priority_score > score_it.priority_score


def test_missing_evidence_and_uncertainty_tracking(scorer):
    # Event with missing fields
    sparse_event = {
        "timestamp": "2026-10-10T12:00:00Z",
    }
    res = scorer.score(
        security_severity=SecuritySeverity.MEDIUM,
        asset=None,
        confidence_score=40.0,
        event_data=sparse_event,
    )

    # Must explicitly flag uncertainty factors
    assert len(res.uncertainty_factors) >= 3
    assert any("Missing source IP" in u for u in res.uncertainty_factors)
    assert any("No process execution" in u for u in res.uncertainty_factors)


def test_maintenance_window_suppression(scorer, critical_plc):
    event_data = {
        "source_ip": "192.168.20.22",
        "dest_ip": "10.10.100.51",
        "process_name": "diagnostic_tool.exe",
    }

    # Normal baseline (no maintenance)
    score_normal = scorer.score(
        security_severity=SecuritySeverity.MEDIUM,
        asset=critical_plc,
        confidence_score=50.0,
        event_data=event_data,
        is_maintenance=False,
    )

    # Active maintenance window
    score_maint = scorer.score(
        security_severity=SecuritySeverity.MEDIUM,
        asset=critical_plc,
        confidence_score=50.0,
        event_data=event_data,
        is_maintenance=True,
    )

    assert score_maint.is_maintenance_suppressed is True
    assert score_maint.priority_score < score_normal.priority_score
    assert any("maintenance window" in e.lower() for e in score_maint.contributing_evidence)
