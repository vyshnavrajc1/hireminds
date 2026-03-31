import enum
from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum, DateTime
from sqlalchemy.sql import func
from app.db.session import Base
from sqlalchemy.orm import relationship

class DepartmentEnum(str, enum.Enum):
    engineering = "Engineering"
    product = "Product"
    design = "Design"

class LocationEnum(str, enum.Enum):
    remote = "Remote"
    hybrid = "Hybrid"
    onsite = "On-site"

class AssessmentDifficultyEnum(str, enum.Enum):
    easy = "Easy (Screening)"
    medium = "Medium (Standard)"
    hard = "Hard (Deep Tech)"

class InterviewFocusEnum(str, enum.Enum):
    standard = "Standard Evaluation"
    strict_tech = "Strict on Core Tech"
    problem_solving = "Heavy on Problem Solving"

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)

    department = Column(Enum(DepartmentEnum), nullable=False)
    location = Column(Enum(LocationEnum), nullable=False)

    assessment_difficulty = Column(Enum(AssessmentDifficultyEnum), nullable=False)
    interview_focus = Column(Enum(InterviewFocusEnum), nullable=False)

    salary_range = Column(String, nullable=True) 
    description = Column(Text, nullable=False)

    hr_id = Column(Integer, ForeignKey("users.id"), nullable=False) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    skills = relationship("JobSkill", back_populates="job", cascade="all, delete-orphan")
    questions = relationship("InterviewQuestion", back_populates="job", cascade="all, delete-orphan")
    fairness_audits = relationship("FairnessAudit", back_populates="job", cascade="all, delete-orphan")

class JobSkill(Base):
    __tablename__ = "job_skills"

    id = Column(Integer, primary_key=True, index= True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable= False)

    skill_name = Column(String, index= True, nullable= False)
    weightage = Column(Integer, nullable=False)

    job = relationship("Job", back_populates="skills")

class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    
    skill_name = Column(String, index=True, nullable=True) # Optional linking to a specific skill
    question_text = Column(Text, nullable=False)
    expected_answer = Column(Text, nullable=False)

    job = relationship("Job", back_populates="questions")
