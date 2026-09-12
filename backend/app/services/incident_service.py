import uuid
import structlog
from typing import Dict, List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.models import Alert, Incident, IncidentStatus, Severity
from app.core.config import settings

log = structlog.get_logger()

engine = create_async_engine(settings.DB_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class IncidentService:
    async def process_alert(self, alert_id: str, tenant_id: int):
        """
        Group an alert into an incident based on the entity or create a new one.
        """
        async with AsyncSessionLocal() as session:
            # Fetch alert
            stmt = select(Alert).where(Alert.id == alert_id)
            result = await session.execute(stmt)
            alert = result.scalar_one_or_none()
            
            if not alert:
                log.error("incident_service.alert_not_found", alert_id=alert_id)
                return None
                
            if alert.incident_id:
                # Already associated
                return alert.incident_id
                
            # Basic correlation: Find open incident for this tenant (simplified MVP logic)
            # In a real system, you'd match by entity, MITRE tactic, or time window.
            stmt = select(Incident).where(
                Incident.tenant_id == tenant_id,
                Incident.status == IncidentStatus.NEW
            ).order_by(Incident.created_at.desc())
            
            result = await session.execute(stmt)
            incident = result.scalars().first()
            
            if incident:
                # Correlate
                alert.incident_id = incident.id
                
                # Upgrade severity if alert is higher
                severity_map = {Severity.LOW: 1, Severity.MEDIUM: 2, Severity.HIGH: 3, Severity.CRITICAL: 4}
                if severity_map.get(alert.severity, 1) > severity_map.get(incident.severity, 1):
                    incident.severity = alert.severity
                    
                incident.updated_at = datetime.utcnow()
                log.info("incident_service.alert_correlated", alert_id=alert_id, incident_id=incident.id)
            else:
                # Create new incident
                incident_id = f"INC-{uuid.uuid4().hex[:8].upper()}"
                incident = Incident(
                    id=incident_id,
                    title=f"Incident escalated from {alert.title}",
                    severity=alert.severity,
                    status=IncidentStatus.NEW,
                    tenant_id=tenant_id
                )
                session.add(incident)
                
                alert.incident_id = incident.id
                log.info("incident_service.incident_created", alert_id=alert_id, incident_id=incident_id)
                
            await session.commit()
            return incident.id

    async def get_incidents(self, tenant_id: int) -> List[Dict]:
        async with AsyncSessionLocal() as session:
            stmt = select(Incident).where(Incident.tenant_id == tenant_id).options(selectinload(Incident.alerts)).order_by(Incident.updated_at.desc())
            result = await session.execute(stmt)
            incidents = result.scalars().all()
            
            # Serialize for response
            out = []
            for inc in incidents:
                inc_dict = {
                    "id": inc.id,
                    "title": inc.title,
                    "severity": inc.severity.value,
                    "status": inc.status.value,
                    "created_at": inc.created_at.isoformat(),
                    "updated_at": inc.updated_at.isoformat(),
                    "alerts": [{"id": a.id, "title": a.title, "severity": a.severity.value} for a in inc.alerts]
                }
                out.append(inc_dict)
                
            return out

incident_service = IncidentService()
