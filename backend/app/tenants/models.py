from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database.base import Base

class Organization(Base):
    __tablename__ = 'organizations'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenants = relationship("Tenant", back_populates="organization")

class Tenant(Base):
    __tablename__ = 'tenants'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    organization_id = Column(Integer, ForeignKey('organizations.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization", back_populates="tenants")
    alerts = relationship("Alert", back_populates="tenant")
    incidents = relationship("Incident", back_populates="tenant")
    cases = relationship("Case", back_populates="tenant")
