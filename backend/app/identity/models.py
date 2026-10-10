from sqlalchemy import Column, Integer, String, DateTime
from enum import Enum as PyEnum
from datetime import datetime
from app.database.base import Base

class UserRole(PyEnum):
    ADMIN = "ADMIN"
    SOC_MANAGER = "SOC_MANAGER"
    L2_ANALYST = "L2_ANALYST"
    L1_ANALYST = "L1_ANALYST"
    THREAT_HUNTER = "THREAT_HUNTER"
    INCIDENT_RESPONDER = "INCIDENT_RESPONDER"
    AUDITOR = "AUDITOR"
    VIEWER = "VIEWER"
    ANALYST = "ANALYST"

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="ANALYST")
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
