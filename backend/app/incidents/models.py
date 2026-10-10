from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from enum import Enum as PyEnum
from datetime import datetime
from app.database.base import Base

from app.alerts.models import Severity

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

class TimelineAction(PyEnum):
    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"
    COMMENT_ADDED = "comment_added"

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
