from app.db.session import Base
from sqlalchemy.sql import func
from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime

class Interview_Evaluation(Base):
    __tablename__= "interview_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    interviewer = Column(String, nullable=False) 

    round_type = Column(String, nullable=False)
    score = Column(Integer, nullable=False)

    feedback = Column(Text, nullable=False)
    conducted_at = Column(DateTime(timezone=True), server_default=func.now())

    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)


