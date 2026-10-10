import pytest
from datetime import datetime, timezone, timedelta
from app.industrial_intelligence.event_correlation import IndustrialEventCorrelationEngine
from app.industrial_intelligence.asset_registry import IndustrialAssetRegistry
from app.industrial_intelligence.impact_scoring import ManufacturingImpactScorer


@pytest.fixture
def engine():
    reg = IndustrialAssetRegistry()
    scorer = ManufacturingImpactScorer()
    return IndustrialEventCorrelationEngine(registry=reg, scorer=scorer, correlation_window_secs=300.0)


def test_cross_zone_event_correlation(engine):
    base_time = datetime(2026, 10, 10, 14, 0, 0, tzinfo=timezone.utc)

    # Event 1: Suspicious process on Engineering Workstation Alpha (192.168.20.15)
    e1 = {
        "source_ip": "192.168.20.15",
        "dest_ip": "192.168.20.15",
        "rule_id": "IND-ENG-POWERSHELL",
        "message": "Suspicious obfuscated PowerShell launched on engineering host",
        "process_name": "powershell.exe",
        "severity": "HIGH",
        "timestamp": base_time.isoformat(),
        "confidence": 75.0,
    }

    # Event 2: Network pivot from Eng Workstation (192.168.20.15) to PLC 101 (10.10.100.51)
    e2 = {
        "source_ip": "192.168.20.15",
        "dest_ip": "10.10.100.51",
        "rule_id": "IND-CROSS-ZONE-S7",
        "message": "Unusual direct S7comm connection from engineering VLAN to drive PLC",
        "severity": "CRITICAL",
        "timestamp": (base_time + timedelta(seconds=45)).isoformat(),
        "confidence": 85.0,
    }

    inc1 = engine.process_event(e1)
    assert inc1 is not None
    assert inc1.event_count == 1
    assert "IND-ENG-01" in inc1.affected_assets

    inc2 = engine.process_event(e2)
    assert inc2 is not None
    assert inc2.incident_id == inc1.incident_id  # Must merge into the same incident!
    assert inc2.event_count == 2
    assert inc2.cross_zone_pivot is True
    assert "IND-PLC-101" in inc2.affected_assets
    assert inc2.impact_assessment.corroboration_bonus > 0


def test_out_of_order_event_timeline(engine):
    t_start = datetime(2026, 10, 10, 14, 0, 0, tzinfo=timezone.utc)
    t_later = t_start + timedelta(seconds=60)
    t_earlier = t_start + timedelta(seconds=15)

    # Send event at t_later first
    e_later = {
        "source_ip": "192.168.20.15",
        "dest_ip": "10.10.100.51",
        "rule_id": "RULE-2",
        "message": "Later event",
        "timestamp": t_later.isoformat(),
    }
    engine.process_event(e_later)

    # Send out-of-order event at t_earlier
    e_earlier = {
        "source_ip": "192.168.20.15",
        "dest_ip": "10.10.100.51",
        "rule_id": "RULE-1",
        "message": "Earlier event arriving late",
        "timestamp": t_earlier.isoformat(),
    }
    inc = engine.process_event(e_earlier)

    assert inc.event_count == 2
    # Check that timeline is chronologically sorted
    assert inc.timeline[0]["rule_id"] == "RULE-1"
    assert inc.timeline[1]["rule_id"] == "RULE-2"


def test_duplicate_event_dropped(engine):
    t_now = datetime(2026, 10, 10, 14, 0, 0, tzinfo=timezone.utc)
    event = {
        "source_ip": "192.168.20.15",
        "dest_ip": "10.10.100.51",
        "rule_id": "RULE-DUP",
        "message": "Repeated network probe",
        "timestamp": t_now.isoformat(),
    }

    inc = engine.process_event(event)
    assert inc is not None
    assert inc.event_count == 1

    # Send exact duplicate immediately
    inc_dup = engine.process_event(event)
    assert inc_dup is None  # Dropped!

    inc_final = engine.get_incident(inc.incident_id)
    assert inc_final.event_count == 1  # Count not incremented


def test_outside_window_creates_new_incident(engine):
    t1 = datetime(2026, 10, 10, 10, 0, 0, tzinfo=timezone.utc)
    t2 = t1 + timedelta(seconds=1200)  # 20 minutes later (well beyond 300s window)

    e1 = {
        "source_ip": "192.168.20.15",
        "dest_ip": "10.10.100.51",
        "rule_id": "RULE-A",
        "timestamp": t1.isoformat(),
    }
    e2 = {
        "source_ip": "192.168.20.15",
        "dest_ip": "10.10.100.51",
        "rule_id": "RULE-B",
        "timestamp": t2.isoformat(),
    }

    inc1 = engine.process_event(e1)
    inc2 = engine.process_event(e2)

    assert inc1.incident_id != inc2.incident_id  # Separate incidents
    assert len(engine.list_incidents()) == 2
