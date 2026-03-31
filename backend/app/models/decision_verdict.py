import enum
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, DateTime, JSON
from sqlalchemy.sql import func
from app.db.session import Base
from sqlalchemy.orm import relationship

class DecisionEnum(str, enum.Enum):
    HIRE = "HIRE"
    MAYBE = "STRONG MAYBE"
    NO_HIRE = "NO HIRE"

class DecisionVerdict(Base):
    __tablename__ = "decision_verdicts"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, unique=True)

    recommendation = Column(Enum(DecisionEnum), nullable=False)
    summary = Column(Text, nullable=False) # High-level reasoning for the verdict
    
    # SWOT analysis stored as JSON
    # { "strengths": [...], "weaknesses": [...], "opportunities": [...], "threats": [...] }
    swot_analysis = Column(JSON, nullable=False)
    
    overall_score = Column(Integer, nullable=False) # Computed overall match percentage
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    application = relationship("Application", back_populates="decision_verdict")
