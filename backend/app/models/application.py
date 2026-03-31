from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from app.db.session import Base
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

class Application(Base):
    __tablename__ = "applications"

    id= Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)  

    email = Column(String, nullable=False, index=True)
    phone_number = Column(String, nullable=False, index=True)

    github_url = Column(String, nullable=True, index=True)
    resume_file_path = Column(String, nullable=False)

    parsed_resume_text = Column(Text, nullable=False)
    status = Column(String, nullable=False)

    applied_at = Column(DateTime(timezone=True), server_default= func.now())
    
    #foreign key
    job_id = Column(Integer, ForeignKey("jobs.id") , nullable=False)
    candidate_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    fairness_audits = relationship("FairnessAudit", back_populates="application", cascade="all, delete-orphan")
    decision_verdict = relationship("DecisionVerdict", uselist=False, back_populates="application", cascade="all, delete-orphan")
