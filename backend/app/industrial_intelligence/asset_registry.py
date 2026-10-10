"""
Industrial Asset Registry
-------------------------
Manages inventory, Purdue hierarchy, operational criticality,
and maintenance windows for simulated manufacturing assets.
"""

from typing import Dict, List, Optional
import structlog
from datetime import datetime

from app.industrial_intelligence.schemas import (
    IndustrialAsset,
    AssetType,
    AssetCriticality,
    PurdueLevel,
    MaintenanceWindow,
    AssetCreateRequest,
    AssetUpdateRequest,
)

log = structlog.get_logger()


class IndustrialAssetRegistry:
    def __init__(self):
        self._assets: Dict[str, IndustrialAsset] = {}
        self._ip_index: Dict[str, str] = {}  # ip -> asset_id
        self._seed_default_synthetic_factory()

    def _seed_default_synthetic_factory(self) -> None:
        """Seeds a realistic synthetic manufacturing facility: IT, Engineering, and OT segments."""
        synthetic_assets = [
            IndustrialAsset(
                asset_id="IND-IT-01",
                name="Enterprise Procurement Workstation",
                asset_type=AssetType.IT_WORKSTATION,
                purdue_level=PurdueLevel.LEVEL_4,
                ip_address="192.168.10.45",
                site="Detroit Plant 01",
                production_zone="Administrative Building - 2nd Floor",
                network_segment="IT-CORP-VLAN-10",
                criticality=AssetCriticality.LOW,
                operational_importance="General administrative and inventory procurement terminal. Failure has zero direct factory floor impact.",
                associated_systems=[],
                owner_team="Enterprise IT Desktop Support",
                is_enabled=True,
                tags=["enterprise", "office", "purdue-l4"],
            ),
            IndustrialAsset(
                asset_id="IND-ENG-01",
                name="Robotics Engineering Workstation Alpha",
                asset_type=AssetType.ENGINEERING_WORKSTATION,
                purdue_level=PurdueLevel.LEVEL_3,
                ip_address="192.168.20.15",
                site="Detroit Plant 01",
                production_zone="Assembly Engineering Enclave",
                network_segment="ENG-VLAN-20",
                criticality=AssetCriticality.HIGH,
                operational_importance="Hosts TIA Portal / Rockwell Studio 5000 logic compilers for Assembly Line 1. Key gateway for authorized PLC firmware pushes.",
                associated_systems=["IND-PLC-101", "IND-SCADA-01"],
                owner_team="Plant Automation Engineering - Shift A",
                is_enabled=True,
                tags=["engineering", "logic-compiler", "purdue-l3"],
            ),
            IndustrialAsset(
                asset_id="IND-ENG-02",
                name="Maintenance Field Laptop Beta",
                asset_type=AssetType.ENGINEERING_WORKSTATION,
                purdue_level=PurdueLevel.LEVEL_3,
                ip_address="192.168.20.22",
                site="Detroit Plant 01",
                production_zone="Line Maintenance Bay",
                network_segment="ENG-VLAN-20",
                criticality=AssetCriticality.MEDIUM,
                operational_importance="Secondary engineering laptop for calibration and sensor diagnostics.",
                associated_systems=["IND-PLC-102"],
                owner_team="Line Maintenance Crew",
                is_enabled=True,
                maintenance_window=MaintenanceWindow(
                    is_active=False,
                    reason="Scheduled weekly calibration window Sundays 02:00-06:00 UTC",
                ),
                tags=["field-laptop", "calibration", "purdue-l3"],
            ),
            IndustrialAsset(
                asset_id="IND-MES-01",
                name="Manufacturing Execution Server (MES)",
                asset_type=AssetType.MANUFACTURING_APP_SERVER,
                purdue_level=PurdueLevel.LEVEL_3,
                ip_address="192.168.20.50",
                site="Detroit Plant 01",
                production_zone="Plant DMZ Operations Center",
                network_segment="DMZ-VLAN-30",
                criticality=AssetCriticality.HIGH,
                operational_importance="Schedules production batches and dispatches work orders to plant supervisory systems. Downtime stalls recipe transitions.",
                associated_systems=["IND-SCADA-01", "IND-HIST-01"],
                owner_team="Plant Operations & Production Planning",
                is_enabled=True,
                tags=["mes", "recipe-dispatch", "purdue-l3"],
            ),
            IndustrialAsset(
                asset_id="IND-SCADA-01",
                name="Central SCADA Supervisory Server",
                asset_type=AssetType.SCADA_SERVER,
                purdue_level=PurdueLevel.LEVEL_2,
                ip_address="10.10.100.10",
                site="Detroit Plant 01",
                production_zone="Central Control Room",
                network_segment="OT-SUPERVISORY-VLAN-100",
                criticality=AssetCriticality.CRITICAL,
                operational_importance="Supervises all real-time telemetry, alarms, and setpoints across Assembly Line 1 & 2. Loss of SCADA blinds control room operators.",
                associated_systems=["IND-HMI-01", "IND-PLC-101", "IND-PLC-102", "IND-HIST-01"],
                owner_team="Supervisory Controls Operations",
                is_enabled=True,
                tags=["scada", "supervisory", "purdue-l2", "protected"],
            ),
            IndustrialAsset(
                asset_id="IND-HMI-01",
                name="Line 1 Operator Touchscreen HMI",
                asset_type=AssetType.HMI_WORKSTATION,
                purdue_level=PurdueLevel.LEVEL_2,
                ip_address="10.10.100.15",
                site="Detroit Plant 01",
                production_zone="Assembly Hall - Cell A",
                network_segment="OT-SUPERVISORY-VLAN-100",
                criticality=AssetCriticality.HIGH,
                operational_importance="Local operator interface for speed adjustments, emergency halts, and part clearance. Loss halts manual cell oversight.",
                associated_systems=["IND-PLC-101"],
                owner_team="Floor Operations - Cell A",
                is_enabled=True,
                tags=["hmi", "operator-touchscreen", "purdue-l2"],
            ),
            IndustrialAsset(
                asset_id="IND-HIST-01",
                name="Plant Industrial Process Historian",
                asset_type=AssetType.INDUSTRIAL_HISTORIAN,
                purdue_level=PurdueLevel.LEVEL_3,
                ip_address="10.10.100.25",
                site="Detroit Plant 01",
                production_zone="Control Data Archive",
                network_segment="OT-SUPERVISORY-VLAN-100",
                criticality=AssetCriticality.MEDIUM,
                operational_importance="Logs high-resolution pressure, temperature, and cycle time timeseries for regulatory compliance and yield analytics.",
                associated_systems=["IND-SCADA-01"],
                owner_team="Quality Assurance & Historian DBAs",
                is_enabled=True,
                tags=["historian", "timeseries", "purdue-l3"],
            ),
            IndustrialAsset(
                asset_id="IND-PLC-101",
                name="Assembly Line 1 Main Drive PLC",
                asset_type=AssetType.PLC_CONTROLLER,
                purdue_level=PurdueLevel.LEVEL_1,
                ip_address="10.10.100.51",
                site="Detroit Plant 01",
                production_zone="Assembly Hall - Conveyor Section",
                network_segment="OT-CONTROL-VLAN-110",
                criticality=AssetCriticality.CRITICAL,
                operational_importance="Controls main conveyor servo motors, synchronization pulses, and safety interlocks. Unauthorized stop causes immediate line shutdown costing $25k/hr.",
                associated_systems=["IND-HMI-01", "IND-SCADA-01"],
                owner_team="Assembly Controls Engineering",
                is_enabled=True,
                tags=["plc", "drive-controller", "purdue-l1", "safety-critical"],
            ),
            IndustrialAsset(
                asset_id="IND-PLC-102",
                name="Packaging Cell Safety Interlock PLC",
                asset_type=AssetType.PLC_CONTROLLER,
                purdue_level=PurdueLevel.LEVEL_1,
                ip_address="10.10.100.52",
                site="Detroit Plant 01",
                production_zone="Packaging Hall - Robotic Stacker",
                network_segment="OT-CONTROL-VLAN-110",
                criticality=AssetCriticality.HIGH,
                operational_importance="Monitors safety light curtains and emergency stop pushbuttons on the robotic stacker. Unscheduled trip pauses end-of-line packaging.",
                associated_systems=["IND-SCADA-01"],
                owner_team="Packaging Automation Lead",
                is_enabled=True,
                tags=["plc", "safety-interlock", "purdue-l1"],
            ),
        ]

        for asset in synthetic_assets:
            self._assets[asset.asset_id] = asset
            self._ip_index[asset.ip_address] = asset.asset_id

        log.info("industrial_asset_registry.initialized", count=len(self._assets))

    def list_assets(
        self,
        asset_type: Optional[AssetType] = None,
        criticality: Optional[AssetCriticality] = None,
        purdue_level: Optional[PurdueLevel] = None,
    ) -> List[IndustrialAsset]:
        """Lists registered industrial assets with optional filters."""
        results = list(self._assets.values())
        if asset_type:
            results = [a for a in results if a.asset_type == asset_type]
        if criticality:
            results = [a for a in results if a.criticality == criticality]
        if purdue_level:
            results = [a for a in results if a.purdue_level == purdue_level]
        return results

    def get_asset(self, asset_id: str) -> Optional[IndustrialAsset]:
        """Retrieves an asset by its unique asset_id."""
        return self._assets.get(asset_id)

    def get_asset_by_ip(self, ip_address: str) -> Optional[IndustrialAsset]:
        """Looks up an asset by network IP address."""
        if not ip_address:
            return None
        asset_id = self._ip_index.get(ip_address)
        return self._assets.get(asset_id) if asset_id else None

    def create_asset(self, req: AssetCreateRequest) -> IndustrialAsset:
        """Registers a new industrial asset."""
        if req.asset_id in self._assets:
            raise ValueError(f"Asset ID '{req.asset_id}' already exists")
        if req.ip_address in self._ip_index:
            raise ValueError(f"IP address '{req.ip_address}' already registered to asset '{self._ip_index[req.ip_address]}'")

        new_asset = IndustrialAsset(
            asset_id=req.asset_id,
            name=req.name,
            asset_type=req.asset_type,
            purdue_level=req.purdue_level,
            ip_address=req.ip_address,
            site=req.site,
            production_zone=req.production_zone,
            network_segment=req.network_segment,
            criticality=req.criticality,
            operational_importance=req.operational_importance,
            associated_systems=req.associated_systems,
            owner_team=req.owner_team,
            maintenance_window=req.maintenance_window,
            is_enabled=req.is_enabled,
            tags=req.tags,
        )

        self._assets[new_asset.asset_id] = new_asset
        self._ip_index[new_asset.ip_address] = new_asset.asset_id
        log.info("industrial_asset.created", asset_id=new_asset.asset_id, ip=new_asset.ip_address)
        return new_asset

    def update_asset(self, asset_id: str, updates: AssetUpdateRequest) -> IndustrialAsset:
        """Updates attributes of an existing asset."""
        asset = self.get_asset(asset_id)
        if not asset:
            raise KeyError(f"Asset '{asset_id}' not found")

        asset_dict = asset.model_dump()
        update_data = {k: v for k, v in updates.model_dump(exclude_unset=True).items() if v is not None}

        # IP address change check
        if "ip_address" in update_data and update_data["ip_address"] != asset.ip_address:
            new_ip = update_data["ip_address"]
            if new_ip in self._ip_index and self._ip_index[new_ip] != asset_id:
                raise ValueError(f"IP address '{new_ip}' is already in use by asset '{self._ip_index[new_ip]}'")
            del self._ip_index[asset.ip_address]
            self._ip_index[new_ip] = asset_id

        asset_dict.update(update_data)
        updated_asset = IndustrialAsset(**asset_dict)
        self._assets[asset_id] = updated_asset
        log.info("industrial_asset.updated", asset_id=asset_id)
        return updated_asset

    def delete_asset(self, asset_id: str) -> bool:
        """Removes an asset from registry."""
        asset = self._assets.pop(asset_id, None)
        if asset:
            self._ip_index.pop(asset.ip_address, None)
            log.info("industrial_asset.deleted", asset_id=asset_id)
            return True
        return False

    def is_in_maintenance(self, asset_id: str) -> bool:
        """Returns True if the asset is currently in an active maintenance window."""
        asset = self.get_asset(asset_id)
        if not asset or not asset.maintenance_window:
            return False
        
        mw = asset.maintenance_window
        if mw.is_active:
            return True
        
        now = datetime.utcnow()
        if mw.start_time and mw.end_time:
            return mw.start_time <= now <= mw.end_time
            
        return False

    def set_maintenance_window(
        self,
        asset_id: str,
        is_active: bool,
        reason: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> IndustrialAsset:
        """Activates or deactivates maintenance window on an asset."""
        asset = self.get_asset(asset_id)
        if not asset:
            raise KeyError(f"Asset '{asset_id}' not found")

        mw = MaintenanceWindow(
            is_active=is_active,
            reason=reason,
            start_time=start_time,
            end_time=end_time,
        )
        return self.update_asset(asset_id, AssetUpdateRequest(maintenance_window=mw))


# Shared singleton instance
asset_registry = IndustrialAssetRegistry()
