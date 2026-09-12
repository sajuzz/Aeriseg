from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from enum import Enum as PyEnum
from datetime import datetime

from app.database.base import Base
from app.identity.models import User, UserRole
from app.tenants.models import Tenant, Organization

from app.alerts.models import Severity, AlertStatus, Alert

class CaseTier(PyEnum):
    TIER_1 = "tier_1"
    TIER_2 = "tier_2"
    TIER_3 = "tier_3"

class CaseStatus(PyEnum):
    OPEN = "open"
    CLOSED = "closed"

class IncidentStatus(PyEnum):
    NEW = "new"
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    COMPLETED = "completed"

class PlaybookStatus(PyEnum):
    ACTIVE = "active"
    DRAFT = "draft"
    DISABLED = "disabled"

class TimelineAction(PyEnum):
    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"
    COMMENT_ADDED = "comment_added"

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



class Incident(Base):
    __tablename__ = 'incidents'
    id = Column(String, primary_key=True, index=True) # UUID
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(Enum(Severity), nullable=False)
    status = Column(Enum(IncidentStatus), nullable=False, default=IncidentStatus.NEW)
    tenant_id = Column(Integer, ForeignKey('tenants.id'), nullable=False)
    assignee_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="incidents")
    alerts = relationship("Alert", back_populates="incident")
    case = relationship("Case", back_populates="incident", uselist=False)

class Case(Base):
    __tablename__ = 'cases'
    id = Column(String, primary_key=True, index=True) # UUID
    title = Column(String, nullable=False)
    tier = Column(Enum(CaseTier), nullable=False, default=CaseTier.TIER_1)
    status = Column(Enum(CaseStatus), nullable=False, default=CaseStatus.OPEN)
    incident_id = Column(String, ForeignKey('incidents.id'), nullable=False)
    tenant_id = Column(Integer, ForeignKey('tenants.id'), nullable=False)
    assignee_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="cases")
    incident = relationship("Incident", back_populates="case")
    notes = relationship("CaseNote", back_populates="case")

class CaseNote(Base):
    __tablename__ = 'case_notes'
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String, ForeignKey('cases.id'), nullable=False)
    author_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case", back_populates="notes")

class Timeline(Base):
    __tablename__ = 'timeline'
    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String, nullable=False) # e.g., 'alert', 'incident', 'case'
    entity_id = Column(String, nullable=False)
    action = Column(Enum(TimelineAction), nullable=False)
    actor_id = Column(Integer, ForeignKey('users.id'), nullable=True)
    details = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

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
