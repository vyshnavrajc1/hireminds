from pydantic import BaseModel
from app.models.job import AssessmentDifficultyEnum, DepartmentEnum, InterviewFocusEnum, LocationEnum
from datetime import datetime

class JobBase(BaseModel):
    title: str
    department: DepartmentEnum
    location: LocationEnum
    assessment_difficulty: AssessmentDifficultyEnum
    interview_focus: InterviewFocusEnum
    salary_range: str
    description: str

class JobCreate(JobBase):
    hr_id: int

class JobResponse(JobBase):
    id: int
    hr_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class InterviewQuestionResponse(BaseModel):
    id: int
    job_id: int
    skill_name: str | None = None
    question_text: str
    expected_answer: str

    class Config:
        from_attributes = True
