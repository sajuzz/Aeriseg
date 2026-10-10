import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, func, select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.core.config import settings
from app.incidents.models import (
    Incident, Case, CaseNote, Timeline, TimelineAction, CaseTier, CaseStatus, IncidentStatus
)
from app.alerts.service import alert_service
from app.models.models import ComplianceEvent # if still needed

log = structlog.get_logger()

SLA = {
    CaseTier.TIER_1: settings.SLA_L1,
    CaseTier.TIER_2: settings.SLA_L2,
    CaseTier.TIER_3: settings.SLA_L3,
}

TIER_ORDER = [CaseTier.TIER_1, CaseTier.TIER_2, CaseTier.TIER_3]

def _cid() -> str:
    return "C-" + str(uuid.uuid4().int)[:4]

def _iid() -> str:
    return "INC-" + str(uuid.uuid4().int)[:4]

async def _tl(
    db: AsyncSession,
    action: TimelineAction,
    entity_type: str,
    entity_id: str,
    detail: str = "",
    actor_id: Optional[int] = None,
    actor_name: Optional[str] = None,
) -> None:
    db.add(Timeline(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        actor_id=actor_id,
        details={"message": detail[:500] if detail else "", "actor_name": actor_name},
    ))
    await db.flush()


class IncidentService:
    async def get_case(self, db: AsyncSession, case_id: str) -> Optional[Case]:
        return (
            await db.execute(select(Case).where(Case.id == case_id))
        ).scalar_one_or_none()

    async def list_cases(
        self,
        db: AsyncSession,
        tier: Optional[CaseTier] = None,
        status: Optional[CaseStatus] = None,
        assignee_id: Optional[int] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Case]:
        q = select(Case)
        filters = []
        if tier:        filters.append(Case.tier == tier)
        if status:      filters.append(Case.status == status)
        if assignee_id: filters.append(Case.assignee_id == assignee_id)
        if filters:     q = q.where(and_(*filters))
        return (
            await db.execute(q.order_by(Case.created_at.desc()).limit(limit).offset(offset))
        ).scalars().all()

    async def update_case(
        self,
        db: AsyncSession,
        case_id: str,
        data: dict,
        actor_id: int,
        actor_name: str,
    ) -> Case:
        case = await self.get_case(db, case_id)
        if not case:
            raise ValueError(f"Case {case_id} not found")

        new_status_str = data.get("status")
        if new_status_str:
            new_status = CaseStatus(new_status_str)
            if new_status == CaseStatus.CLOSED:
                await _tl(
                    db, TimelineAction.UPDATED, "case", case_id,
                    f"Closed by {actor_name}",
                    actor_id, actor_name,
                )
            case.status = new_status

        # Map other simple fields
        for field in ("assignee_id", "title"):
            if field in data and data[field] is not None:
                setattr(case, field, data[field])

        await _tl(
            db, TimelineAction.UPDATED, "case", case_id,
            f"Updated by {actor_name}",
            actor_id, actor_name,
        )
        await db.commit()
        await db.refresh(case)
        return case

    async def get_incident(self, db: AsyncSession, inc_id: str) -> Optional[Incident]:
        return (
            await db.execute(select(Incident).where(Incident.id == inc_id))
        ).scalar_one_or_none()

    async def list_incidents(
        self,
        db: AsyncSession,
        status: Optional[IncidentStatus] = None,
        severity: Optional[str] = None,
        tenant_id: Optional[int] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Incident]:
        q = select(Incident).options(selectinload(Incident.alerts))
        filters = []
        if status:   filters.append(Incident.status == status)
        # Severity from Incident schema
        if severity: filters.append(Incident.severity == severity.upper())
        if tenant_id: filters.append(Incident.tenant_id == tenant_id)
        if filters:  q = q.where(and_(*filters))
        return (
            await db.execute(q.order_by(Incident.created_at.desc()).limit(limit).offset(offset))
        ).scalars().all()

    async def process_alert(self, db: AsyncSession, alert_id: str, tenant_id: int):
        from app.alerts.models import Alert

        # Fetch alert
        stmt = select(Alert).where(Alert.id == alert_id)
        result = await db.execute(stmt)
        alert = result.scalar_one_or_none()
        
        if not alert:
            log.error("incident_service.alert_not_found", alert_id=alert_id)
            return None
            
        if alert.incident_id:
            # Already associated
            return alert.incident_id
            
        stmt = select(Incident).where(
            Incident.tenant_id == tenant_id,
            Incident.status == IncidentStatus.NEW
        ).order_by(Incident.created_at.desc())
        
        result = await db.execute(stmt)
        incident = result.scalars().first()
        
        if incident:
            # Correlate
            alert.incident_id = incident.id
            
            # Upgrade severity if alert is higher
            severity_map = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
            if severity_map.get(alert.severity.value, 1) > severity_map.get(incident.severity.value, 1):
                incident.severity = alert.severity
                
            incident.updated_at = datetime.utcnow()
        else:
            # Create new incident
            incident = Incident(
                id=_iid(),
                title=f"Incident escalated from {alert.title}",
                severity=alert.severity,
                status=IncidentStatus.NEW,
                tenant_id=tenant_id
            )
            db.add(incident)
            await db.flush()
            
            alert.incident_id = incident.id
            
        await db.commit()
        return incident.id

    async def create_incident(
        self,
        db: AsyncSession,
        data: dict,
        actor_id: int,
        actor_name: str,
    ) -> Incident:
        
        inc = Incident(
            id=_iid(),
            title=data.get("title", "New Incident"),
            description=data.get("description"),
            severity=data.get("severity", "HIGH").upper(),
            status=IncidentStatus.NEW,
            tenant_id=data.get("tenant_id", 1),
        )
        db.add(inc)
        await db.flush()

        await _tl(
            db, TimelineAction.CREATED, "incident", inc.id,
            f"Incident created by {actor_name}",
            actor_id, actor_name,
        )
        await db.commit()
        await db.refresh(inc)
        return inc

    async def update_incident(
        self,
        db: AsyncSession,
        incident_id: str,
        data: dict,
        actor_id: int,
        actor_name: str,
    ) -> Incident:
        inc = await self.get_incident(db, incident_id)
        if not inc:
            raise ValueError(f"Incident {incident_id} not found")

        allowed = {"status", "title", "description", "assignee_id", "severity"}
        for field in allowed:
            if field in data and data[field] is not None:
                if field == "status":
                    setattr(inc, field, IncidentStatus(data[field]))
                else:
                    setattr(inc, field, data[field])

        await _tl(
            db, TimelineAction.UPDATED, "incident", incident_id,
            f"Updated by {actor_name}: status={data.get('status','')}",
            actor_id, actor_name,
        )
        await db.commit()
        await db.refresh(inc)
        return inc

    async def get_timeline(
        self,
        db: AsyncSession,
        entity_type: Optional[str] = None,
        entity_id:   Optional[str] = None,
        limit: int = 200,
    ) -> List[Timeline]:
        q = select(Timeline)
        filters = []
        if entity_type: filters.append(Timeline.entity_type == entity_type)
        if entity_id:   filters.append(Timeline.entity_id   == entity_id)
        if filters:     q = q.where(and_(*filters))
        return (
            await db.execute(q.order_by(Timeline.timestamp.desc()).limit(limit))
        ).scalars().all()

incident_service = IncidentService()
