from pydantic import BaseModel
from typing import List

class AnswerSubmission(BaseModel):
    skill_name: str
    question_text: str
    expected_answer: str
    candidate_answer: str

class InterviewSubmission(BaseModel):
    application_id: int
    job_id: int
    answers: List[AnswerSubmission]

class CandidateScore(BaseModel):
    skill: str
    score: int
    reason: str

class InterviewGradingResult(BaseModel):
    overall_match_score: int
    candidate_scores: List[CandidateScore]
