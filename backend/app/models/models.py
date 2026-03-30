from sqlalchemy import Column, Integer, String, Enum, DateTime
from sqlalchemy.ext.declarative import declarative_base
from enum import Enum as PyEnum

Base = declarative_base()

class UserRole(PyEnum):
    ADMIN = "admin"
    USER = "user"

class Severity(PyEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class AlertStatus(PyEnum):
    ACTIVE = "active"
    RESOLVED = "resolved"

class CaseTier(PyEnum):
    TIER_1 = "tier_1"
    TIER_2 = "tier_2"
    TIER_3 = "tier_3"

class CaseStatus(PyEnum):
    OPEN = "open"
    CLOSED = "closed"

class IncidentStatus(PyEnum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class TimelineAction(PyEnum):
    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)

class Alert(Base):
    __tablename__ = 'alerts'
    id = Column(Integer, primary_key=True)
    severity = Column(Enum(Severity), nullable=False)
    status = Column(Enum(AlertStatus), nullable=False)

class Case(Base):
    __tablename__ = 'cases'
    id = Column(Integer, primary_key=True)
    tier = Column(Enum(CaseTier), nullable=False)
    status = Column(Enum(CaseStatus), nullable=False)

class Incident(Base):
    __tablename__ = 'incidents'
    id = Column(Integer, primary_key=True)
    status = Column(Enum(IncidentStatus), nullable=False)

class Timeline(Base):
    __tablename__ = 'timeline'
    id = Column(Integer, primary_key=True)
    action = Column(Enum(TimelineAction), nullable=False)
    timestamp = Column(DateTime, nullable=False)

class DetectionRule(Base):
    __tablename__ = 'detection_rules'
    id = Column(Integer, primary_key=True)
    severity = Column(Enum(Severity), nullable=False)
