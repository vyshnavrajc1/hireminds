import enum
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, DateTime, JSON
from sqlalchemy.sql import func
from app.db.session import Base
from sqlalchemy.orm import relationship

class AuditTypeEnum(str, enum.Enum):
    JD_AUDIT = "JD_AUDIT"
    CANDIDATE_AUDIT = "CANDIDATE_AUDIT"

class FairnessAudit(Base):
    __tablename__ = "fairness_audits"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=True)

    audit_type = Column(Enum(AuditTypeEnum), nullable=False)
    score = Column(Integer, nullable=False) # 0-100 (100 is most fair)
    findings = Column(JSON, nullable=False) # List of specific bias detections
    recommendations = Column(Text, nullable=True) # Actionable advice

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    job = relationship("Job", back_populates="fairness_audits")
    application = relationship("Application", back_populates="fairness_audits")
