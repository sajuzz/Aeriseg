import pytest
from app.industrial_intelligence.asset_registry import IndustrialAssetRegistry
from app.industrial_intelligence.schemas import (
    AssetCreateRequest,
    AssetUpdateRequest,
    AssetType,
    AssetCriticality,
    PurdueLevel,
)


def test_registry_seed_initialization():
    registry = IndustrialAssetRegistry()
    assets = registry.list_assets()
    assert len(assets) >= 9

    # Verify Purdue Level representation
    levels = {a.purdue_level for a in assets}
    assert PurdueLevel.LEVEL_1 in levels  # PLCs
    assert PurdueLevel.LEVEL_2 in levels  # SCADA / HMI
    assert PurdueLevel.LEVEL_3 in levels  # Eng / Historian / MES
    assert PurdueLevel.LEVEL_4 in levels  # Enterprise IT


def test_asset_lookup_by_ip():
    registry = IndustrialAssetRegistry()
    plc = registry.get_asset_by_ip("10.10.100.51")
    assert plc is not None
    assert plc.asset_id == "IND-PLC-101"
    assert plc.asset_type == AssetType.PLC_CONTROLLER
    assert plc.criticality == AssetCriticality.CRITICAL
    assert plc.purdue_level == PurdueLevel.LEVEL_1

    # Non-existent IP
    assert registry.get_asset_by_ip("192.168.99.99") is None


def test_asset_creation_and_duplicate_handling():
    registry = IndustrialAssetRegistry()
    req = AssetCreateRequest(
        asset_id="IND-PLC-201",
        name="Welding Cell PLC",
        asset_type=AssetType.PLC_CONTROLLER,
        purdue_level=PurdueLevel.LEVEL_1,
        ip_address="10.10.100.99",
        site="Detroit Plant 01",
        production_zone="Welding Hall",
        network_segment="OT-CONTROL-VLAN-110",
        criticality=AssetCriticality.HIGH,
        operational_importance="Controls robotic spot welders",
        owner_team="Welding Automation Lead",
    )
    asset = registry.create_asset(req)
    assert asset.asset_id == "IND-PLC-201"
    assert registry.get_asset("IND-PLC-201") is not None

    # Duplicate asset_id rejection
    with pytest.raises(ValueError, match="already exists"):
        registry.create_asset(req)

    # Duplicate IP rejection
    req_dup_ip = req.model_copy(update={"asset_id": "IND-PLC-202"})
    with pytest.raises(ValueError, match="already registered"):
        registry.create_asset(req_dup_ip)


def test_maintenance_window_handling():
    registry = IndustrialAssetRegistry()
    asset_id = "IND-ENG-02"
    assert not registry.is_in_maintenance(asset_id)

    # Activate maintenance window
    registry.set_maintenance_window(
        asset_id=asset_id,
        is_active=True,
        reason="Scheduled diagnostic calibration",
    )
    assert registry.is_in_maintenance(asset_id)

    # Deactivate maintenance window
    registry.set_maintenance_window(
        asset_id=asset_id,
        is_active=False,
    )
    assert not registry.is_in_maintenance(asset_id)
