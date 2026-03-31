import json
from google import genai
import typing_extensions as typing
from pydantic import BaseModel
from app.core.config import settings
from fastapi import BackgroundTasks
from typing import List

from fastapi import APIRouter, status, Depends
from app.schemas.job import JobCreate, JobResponse, InterviewQuestionResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.job import Job, JobSkill, InterviewQuestion
from app.models.application import Application
from app.models.interview_evaluation import Interview_Evaluation
from app.models.fairness_audit import FairnessAudit, AuditTypeEnum
from app.api.dependency import require_hr

client = genai.Client(api_key=settings.GEMINI_API_KEY)


def process_job_ai_tasks(job_id: int, title: str, description: str, db: Session):
    print(f"AI Agent is analyzing JD for Job {job_id}...")
    
    try:
        
        prompt = f"""
        You are an expert HR Technical Recruiter.
        Analyze the following job title and description.
        1. Extract the most critical technical and soft skills required for this role.
           Assign a 'weightage' to each skill from 1 to 100 representing its importance. Ensure that the total weightage of all skills exactly sums up to 100.
        2. Generate 5 structured interview questions along with their expected ideal answers based on these skills.
        
        Job Title: {title}
        Job Description: {description}
        """
        
        # 1. Define the schema strictly as a dictionary to bypass Python 3.9 typing bugs
        gemini_schema = {
            "type": "OBJECT",
            "properties": {
                "skills": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "skill_name": {"type": "STRING"},
                            "weightage": {"type": "INTEGER"}
                        },
                        "required": ["skill_name", "weightage"]
                    }
                },
                "questions": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "skill_name": {"type": "STRING", "description": "The skill this question targets, matching a skill from the skills list if possible"},
                            "question_text": {"type": "STRING"},
                            "expected_answer": {"type": "STRING"}
                        },
                        "required": ["skill_name", "question_text", "expected_answer"]
                    }
                }
            },
            "required": ["skills", "questions"]
        }
        
        # 2. Call the Gemini model using the correct client SDK syntax
        from google.genai import types
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=gemini_schema
            )
        )
        
        # 3. Parse the JSON
        response_data = json.loads(response.text)
        skills_data = response_data.get("skills", [])
        questions_data = response_data.get("questions", [])
        
        # 4. Save to PostgreSQL
        for item in skills_data:
            db_skill = JobSkill(
                job_id=job_id,
                skill_name=item["skill_name"],
                weightage=item["weightage"]
            )
            db.add(db_skill)
            
        for q_item in questions_data:
            db_question = InterviewQuestion(
                job_id=job_id,
                skill_name=q_item.get("skill_name"),
                question_text=q_item["question_text"],
                expected_answer=q_item["expected_answer"]
            )
            db.add(db_question)
            
        db.commit()
        print(f"AI successfully extracted {len(skills_data)} skills and {len(questions_data)} questions!")

        # 5. TRIGGER JD BIAS AUDIT (Agentic "Bias & Fairness" Layer)
        audit_job_description_for_bias(job_id, title, description, db)
        
    except Exception as e:
        print(f" AI Extraction failed: {str(e)}")
        db.rollback()

def audit_job_description_for_bias(job_id: int, title: str, description: str, db: Session):
    print(f"Bias & Fairness Agent is auditing Job {job_id}...")
    
    prompt = f"""
    You are an expert Bias & Fairness Audit Agent in HR tech.
    Analyze the following Job Title and Description for systemic biases.
    
    Look for:
    1. Gendered language (e.g., 'rockstar', 'ninja', 'he/she' imbalance).
    2. Ageism (e.g., 'recent grad', 'digital native', 'high energy' used as youth proxy).
    3. Pedigree Bias (e.g., 'top-tier school only', 'Ivy League preferred').
    4. Racial or Cultural Biases (e.g., 'perfect English', 'native speaker' where not essential).
    
    Score the fairness from 0 to 100 (100 being perfectly unbiased and inclusive).
    Identify specific findings and provide actionable recommendations.
    
    JOB TITLE: {title}
    JOB DESCRIPTION: {description}
    """
    
    gemini_schema = {
        "type": "OBJECT",
        "properties": {
            "score": {"type": "INTEGER"},
            "findings": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "category": {"type": "STRING"},
                        "message": {"type": "STRING"},
                        "severity": {"type": "STRING", "enum": ["Low", "Medium", "High"]}
                    },
                    "required": ["category", "message", "severity"]
                }
            },
            "recommendations": {"type": "STRING"}
        },
        "required": ["score", "findings", "recommendations"]
    }
    
    try:
        from google.genai import types
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=gemini_schema
            )
        )
        
        audit_data = json.loads(response.text)
        
        audit_record = FairnessAudit(
            job_id=job_id,
            audit_type=AuditTypeEnum.JD_AUDIT,
            score=audit_data["score"],
            findings=audit_data["findings"],
            recommendations=audit_data["recommendations"]
        )
        
        db.add(audit_record)
        db.commit()
        print(f"Fairness Audit for Job {job_id} completed with score {audit_data['score']}")
        
    except Exception as e:
        print(f"Fairness Audit failed for Job {job_id}: {str(e)}")
        db.rollback()


router = APIRouter()

@router.post("/", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job(job_in: JobCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), _: str = Depends(require_hr)):
    db_Job = Job(
        title = job_in.title,
        department = job_in.department,
        location = job_in.location,
        assessment_difficulty = job_in.assessment_difficulty,
        interview_focus = job_in.interview_focus,
        salary_range = job_in.salary_range,
        description = job_in.description,
        hr_id = job_in.hr_id
    )
    db.add(db_Job)
    db.commit()
    db.refresh(db_Job)

    background_tasks.add_task(
        process_job_ai_tasks, 
        job_id=db_Job.id, 
        title=job_in.title, 
        description=job_in.description, 
        db=db
    )

    return db_Job


@router.get("/hr/{hr_id}", status_code=status.HTTP_200_OK)
def get_jobs(hr_id: int, db: Session = Depends(get_db), _: str = Depends(require_hr)):
    # 1. Fetch details fo job using job ID
    jobs = db.query(Job).filter(Job.hr_id == hr_id).all()
    
    if not jobs:
        return []
        
    formatted_jobs = [
        {
            "id": joby.id,
            "title": joby.title,    
            "description": joby.description,   
            "location": joby.location,
            "assessment_difficulty": joby.assessment_difficulty,
            "interview_focus": joby.interview_focus,
            "salary_range": joby.salary_range,
            "department": joby.department,
            "fairness_audits": [
                {
                    "score": audit.score,
                    "findings": audit.findings,
                    "recommendations": audit.recommendations,
                    "type": audit.audit_type
                } for audit in joby.fairness_audits
            ]
        }
        for joby in jobs
    ]
    
    return formatted_jobs

@router.get("/", status_code=status.HTTP_200_OK)
def get_all_jobs( db: Session = Depends(get_db)):
    # 1. Fetch details of all jobs.
    jobs = db.query(Job).all()
    
    if not jobs:
        return []
        
    formatted_jobs = [
        {
            "id": joby.id,
            "title": joby.title,    
            "description": joby.description,   
            "location": joby.location,
            "salary_range": joby.salary_range,
            "department": joby.department
        }
        for joby in jobs
    ]
    
    return formatted_jobs




@router.get("/{job_id}/skills", status_code=status.HTTP_200_OK)
def get_job_skills(job_id: int, db: Session = Depends(get_db), _: str = Depends(require_hr)):
    # 1. Fetch all skills linked to this specific job ID
    db_skills = db.query(JobSkill).filter(JobSkill.job_id == job_id).all()
    
    # 2. If no skills are found, return an empty list so the frontend doesn't crash
    if not db_skills:
        return []
        
    # 3. Translate the database columns to perfectly match your React frontend interface
    formatted_skills = [
        {
            "id": skill.id,
            "name": skill.skill_name,    # Translating skill_name -> name
            "weight": skill.weightage    # Translating weightage -> weight
        }
        for skill in db_skills
    ]
    
    return formatted_skills


@router.get("/{job_id}/questions", status_code=status.HTTP_200_OK, response_model=List[InterviewQuestionResponse])
def get_job_questions(job_id: int, db: Session = Depends(get_db), _: str = Depends(require_hr)):
    # 1. Fetch all interview questions linked to this specific job ID
    db_questions = db.query(InterviewQuestion).filter(InterviewQuestion.job_id == job_id).all()
    
    # 2. If no questions are found, return an empty list
    if not db_questions:
        return []
        
    return db_questions

@router.get("/{job_id}/candidates", status_code=status.HTTP_200_OK)
def get_job_candidates(job_id: int, db: Session = Depends(get_db), _: str = Depends(require_hr)):
    applications = db.query(Application).filter(Application.job_id == job_id).all()
    
    if not applications:
        return []
        
    app_ids = [app.id for app in applications]
    evaluations = db.query(Interview_Evaluation).filter(Interview_Evaluation.application_id.in_(app_ids)).all()
    
    evals_by_app = {app_id: [] for app_id in app_ids}
    for ev in evaluations:
        evals_by_app[ev.application_id].append({
            "id": ev.id,
            "interviewer": ev.interviewer,
            "round_type": ev.round_type,
            "score": ev.score,
            "feedback": json.loads(ev.feedback) if ev.feedback else [],
            "conducted_at": ev.conducted_at
        })

    formatted_applications = [
        {
            "id": app.id,
            "full_name": app.full_name,
            "email": app.email,
            "phone_number": app.phone_number,
            "github_url": app.github_url,
            "status": app.status,
            "job_id": app.job_id,
            "candidate_id": app.candidate_id,
            "applied_at": app.applied_at,
            "evaluations": evals_by_app.get(app.id, []),
            "fairness_audits": [
                {
                    "score": audit.score,
                    "findings": audit.findings,
                    "recommendations": audit.recommendations,
                    "type": audit.audit_type
                } for audit in app.fairness_audits
            ],
            "decision_verdict": {
                "recommendation": app.decision_verdict.recommendation if app.decision_verdict else None,
                "summary": app.decision_verdict.summary if app.decision_verdict else None,
                "swot": app.decision_verdict.swot_analysis if app.decision_verdict else None,
                "overall_score": app.decision_verdict.overall_score if app.decision_verdict else None
            } if app.decision_verdict else None
        }
        for app in applications
    ]
    
    return formatted_applications
