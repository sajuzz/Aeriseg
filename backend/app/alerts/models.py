from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from enum import Enum as PyEnum
from datetime import datetime
from app.database.base import Base

class Severity(PyEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AlertStatus(PyEnum):
    NEW = "new"
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED_FALSE_POSITIVE = "closed_false_positive"

class Alert(Base):
    __tablename__ = 'alerts'
    id = Column(String, primary_key=True, index=True) # UUID
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(Enum(Severity), nullable=False)
    status = Column(Enum(AlertStatus), nullable=False, default=AlertStatus.NEW)
    rule_id = Column(String, ForeignKey('detection_rules.id'), nullable=True)
    tenant_id = Column(Integer, ForeignKey('tenants.id'), nullable=False)
    source_event_ids = Column(JSON, nullable=True) # List of ES doc IDs
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="alerts")
    incident_id = Column(String, ForeignKey('incidents.id'), nullable=True)
    incident = relationship("Incident", back_populates="alerts")
