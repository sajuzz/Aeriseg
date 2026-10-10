from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from enum import Enum as PyEnum
from datetime import datetime

from app.database.base import Base
from app.identity.models import User, UserRole
from app.tenants.models import Tenant, Organization

from app.alerts.models import Severity, AlertStatus, Alert

from app.incidents.models import CaseTier, CaseStatus, IncidentStatus, TimelineAction, Incident, Case, CaseNote, Timeline

class PlaybookStatus(PyEnum):
    ACTIVE = "active"
    DRAFT = "draft"
    DISABLED = "disabled"

class DetectionRule(Base):
    __tablename__ = 'detection_rules'
    id = Column(String, primary_key=True, index=True) # Usually string like UUID or string identifier
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(Enum(Severity), nullable=False)
    query_dsl = Column(JSON, nullable=True) # Elasticsearch query
    enabled = Column(Boolean, default=True)
    tenant_id = Column(Integer, ForeignKey('tenants.id'), nullable=True) # Null for global rules
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)





class Playbook(Base):
    __tablename__ = 'playbooks'
    id = Column(String, primary_key=True, index=True) # UUID
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(PlaybookStatus), nullable=False, default=PlaybookStatus.DRAFT)
    trigger_type = Column(String, nullable=False) # e.g. "on_alert", "on_incident", "manual"
    tenant_id = Column(Integer, ForeignKey('tenants.id'), nullable=False)
    definition = Column(JSON, nullable=False) # JSON structure defining the steps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant = relationship("Tenant")

class PlaybookExecution(Base):
    __tablename__ = 'playbook_executions'
    id = Column(String, primary_key=True, index=True) # UUID
    playbook_id = Column(String, ForeignKey('playbooks.id'), nullable=False)
    status = Column(String, nullable=False) # "running", "completed", "failed"
    trigger_entity_type = Column(String, nullable=False) # "alert" or "incident"
    trigger_entity_id = Column(String, nullable=False)
    tenant_id = Column(Integer, ForeignKey('tenants.id'), nullable=False)
    results = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    playbook = relationship("Playbook")

import uuid

class ComplianceEvent(Base):
    __tablename__ = 'compliance_events'
    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    framework = Column(String, nullable=False, default="GENERAL")
    control_id = Column(String, nullable=True)
    control_name = Column(String, nullable=True)
    severity = Column(String, nullable=True, default="MEDIUM")
    phi_involved = Column(Boolean, default=False)
    status = Column(String, nullable=False, default="OPEN")
    breach_risk = Column(Boolean, default=False)
    description = Column(Text, nullable=True)
    tenant_id = Column(Integer, ForeignKey('tenants.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


