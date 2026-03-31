from pydantic import BaseModel
from typing import List

class SkillScore(BaseModel):
    skill_name: str
    score: int
    reasoning: str

class ResumeEvaluation(BaseModel):
    candidate_scores: List[SkillScore]
    overall_match_score: int