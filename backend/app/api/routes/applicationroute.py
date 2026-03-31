from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException
from app.db.session import get_db   
from sqlalchemy.orm import Session
from app.models.application import Application
import PyPDF2
import os
import io
import uuid
from google import genai
from google.genai import types
import json
from app.models.job import JobSkill
from app.core.config import settings
from app.schemas.resume_evaluation import ResumeEvaluation
from app.schemas.interview_evaluation import InterviewSubmission, InterviewGradingResult
from app.models.fairness_audit import FairnessAudit, AuditTypeEnum
from app.models.decision_verdict import DecisionVerdict, DecisionEnum
from app.models.interview_evaluation import Interview_Evaluation
from app.api.dependency import require_hr, require_candidate

client = genai.Client(api_key=settings.GEMINI_API_KEY)

def evaluate_resume_with_ai(job_id: int, application_id: int, resume_text: str, db: Session):

    job_skills = db.query(JobSkill).filter(JobSkill.job_id == job_id).all()

    if not job_skills:
        print("No specific skills found")
        return None
    
    skills_list_text = "\n".join(
        [f"- {skill.skill_name} (weightage: {skill.weightage})/100" for skill in job_skills]
    )

    prompt = f"""
    You are an expert Technical HR Recruiter. 
    Evaluate the candidate's resume against the required skills for this job.
    
    For each required skill, assign a score from 0 to 100 based on how well the candidate's resume demonstrates experience with that skill. 
    Consider the 'Weightage' when calculating the overall match score.
    Provide a brief, 1-sentence reasoning for why you gave that score.
    
    REQUIRED JOB SKILLS:
    {skills_list_text}
    
    CANDIDATE RESUME TEXT:
    {resume_text}
    """

    try:
        # FIX 1: Changed 'model' to 'models'
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ResumeEvaluation
            )
        )

        # FIX 2: Changed 'response.txt' to 'response.text'
        evaluation_data = json.loads(response.text)
        
        evaluation_record = Interview_Evaluation(
            interviewer="AI Resume Evaluator",
            round_type="Resume Screening",
            score=evaluation_data.get("overall_match_score", 0),
            feedback=json.dumps(evaluation_data.get("candidate_scores", [])),
            application_id=application_id
        )
        
        db.add(evaluation_record)
        db.commit()
        db.refresh(evaluation_record)

        # TRIGGER EVALUATION AUDIT (Agentic "Bias & Fairness" Layer)
        audit_evaluation_for_bias(application_id, "Resume Screening", evaluation_data.get("candidate_scores", []), db)

        # TRIGGER DECISION AGENT — preliminary verdict from resume only; updated again after interview
        generate_final_verdict(application_id, db)

        print(f"evaluation_id {evaluation_record.id}")
        print(f"score {evaluation_record.score}")
        print(f"overall_match_score {evaluation_data.get('overall_match_score', 0)}")
        
        return {
            "evaluation_id": evaluation_record.id,
            "score": evaluation_record.score,
            "candidate_scores": evaluation_data.get("candidate_scores", []),
            "overall_match_score": evaluation_data.get("overall_match_score", 0)
        }
        
    except Exception as e:
        print(f"Error evaluating resume with AI: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to evaluate resume: {str(e)}")

router = APIRouter()

UPLOAD_DIR = "uploads/resumes"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/")
async def create_appliation(full_name: str = Form(...), email: str = Form(...), phone_number: str = Form(...), github_url: str = Form(None), status: str = Form("pending"), job_id: int = Form(...), candidate_id: int = Form(...), resume: UploadFile = File(...), db: Session = Depends(get_db), _: str = Depends(require_candidate)):
    
    if not resume.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only Pdf files are allowed")
    
    file_bytes = await resume.read()
    parsed_text = ""

    try:
        # io.BytesIO makes the raw bytes act like a file object
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        for page in pdf_reader.pages:
            extracted = page.extract_text()
            if extracted:
                parsed_text += extracted + "\n"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {str(e)}")
    
    unique_filename = f"{uuid.uuid4()}.pdf"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as f:
        f.write(file_bytes)
    
    db_details = Application(
        full_name=full_name,
        email=email,
        phone_number=phone_number,
        github_url=github_url,
        status=status,
        job_id=job_id,
        candidate_id=candidate_id,
        resume_file_path=file_path,
        parsed_resume_text=parsed_text.strip()
    )
    db.add(db_details)
    db.commit()
    db.refresh(db_details)
    
    # Evaluate resume with AI after application is created
    evaluate_resume_with_ai(
        job_id=job_id,
        application_id=db_details.id,
        resume_text=parsed_text.strip(),
        db=db
    )

    return db_details

@router.post("/interview/evaluate")
async def evaluate_interview_answers(submission: InterviewSubmission, db: Session = Depends(get_db), _: str = Depends(require_hr)):
    answers_text = ""
    for idx, ans in enumerate(submission.answers):
        answers_text += f"\n--- Question {idx+1} ({ans.skill_name}) ---\n"
        answers_text += f"Q: {ans.question_text}\n"
        answers_text += f"Expected: {ans.expected_answer}\n"
        answers_text += f"Candidate Answer: {ans.candidate_answer}\n"
        
    prompt = f"""
    You are an expert HR Technical Recruiter and Assessor.
    You are evaluating a candidate's spoken interview answers compared to the ideal expected answers for a specific job.
    
    For each question, assign a score from 0 to 100 based on how well the candidate's answer matches the expected technical and soft skills logic.
    Make the 'skill' key in your response simply the 'skill_name' that was tested.
    Provide a brief, 1-sentence reasoning for why you gave that score.
    Also calculate an overall match score out of 100 based on the average performance.
    
    INTERVIEW TRANSCRIPT:
    {answers_text}
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=InterviewGradingResult
            )
        )
        
        evaluation_data = json.loads(response.text)
        
        evaluation_record = Interview_Evaluation(
            interviewer="HR Team & AI Grader Agent",
            round_type="Structured Live Interview",
            score=evaluation_data.get("overall_match_score", 0),
            feedback=json.dumps(evaluation_data.get("candidate_scores", [])),
            application_id=submission.application_id
        )
        
        db.add(evaluation_record)
        db.commit()
        db.refresh(evaluation_record)

        # TRIGGER EVALUATION AUDIT (Agentic "Bias & Fairness" Layer)
        audit_evaluation_for_bias(submission.application_id, "Structured Live Interview", evaluation_data.get("candidate_scores", []), db)
        
        # TRIGGER THE DECISION AGENT — final verdict, overwrites the resume-only preliminary verdict
        generate_final_verdict(submission.application_id, db)
        
        return {
            "evaluation_id": evaluation_record.id,
            "overall_score": evaluation_record.score,
            "status": "success"
        }
    except Exception as e:
        print(f"Error grading interview: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to grade interview: {str(e)}")

def audit_evaluation_for_bias(application_id: int, round_name: str, feedback_data: list, db: Session):
    print(f"Bias & Fairness Agent is auditing {round_name} for Application {application_id}...")
    
    prompt = f"""
    You are an expert Bias & Fairness Audit Agent in HR tech.
    Analyze the following AI-generated evaluation feedback for potential systemic biases.
    
    EVALUATION ROUND: {round_name}
    FEEDBACK DATA: {json.dumps(feedback_data)}
    
    Look for:
    1. Pedigree Bias (over-valuing specific universities or companies over skills).
    2. Subtle Gender/Age/Racial Biases in the "reasoning" text.
    3. Overly harsh scoring for non-technical reasons.
    
    Score the fairness of this specific AI evaluation from 0 to 100.
    Identify findings and provide recommendations.
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
            application_id=application_id,
            audit_type=AuditTypeEnum.CANDIDATE_AUDIT,
            score=audit_data["score"],
            findings=audit_data["findings"],
            recommendations=audit_data["recommendations"]
        )
        
        db.add(audit_record)
        db.commit()
        print(f"Fairness Audit for Application {application_id} completed with score {audit_data['score']}")
        
    except Exception as e:
        print(f"Fairness Audit failed for Application {application_id}: {str(e)}")
        db.rollback()

def generate_final_verdict(application_id: int, db: Session):
    print(f"Decision Agent is generating final verdict for Application {application_id}...")
    
    # 1. Gather all data (Resume screening, Interview evaluations, Fairness audits)
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app: return
    
    evaluations = db.query(Interview_Evaluation).filter(Interview_Evaluation.application_id == application_id).all()
    fairness_audits = db.query(FairnessAudit).filter(FairnessAudit.application_id == application_id).all()
    
    # 2. Package for Gemini
    data_summary = {
        "candidate_name": app.full_name,
        "resume_content": app.parsed_resume_text[:2000], # Trucated for context window
        "rounds": [
            {
                "round": ev.round_type,
                "score": ev.score,
                "feedback": json.loads(ev.feedback) if "[" in ev.feedback else ev.feedback
            } for ev in evaluations
        ],
        "fairness_audits": [
            {
                "type": audit.audit_type,
                "score": audit.score,
                "findings": audit.findings
            } for audit in fairness_audits
        ]
    }
    
    prompt = f"""
    You are a Chief Talent Officer (Decision Agent) reviewing a candidate's full recruitment profile.
    Based on the following data, provide a formal hiring verdict.
    
    CANDIDATE DATA: {json.dumps(data_summary)}
    
    Task:
    1. Assign an overall match score (0-100).
    2. Provide a 2x2 SWOT Analysis: Strengths, Weaknesses, Opportunities (growth potential), and Threats (risks).
    3. Write a high-level candidate summary (2-3 sentences).
    4. Provide a recommendation: HIRE, STRONG MAYBE, or NO HIRE.
    """
    
    gemini_schema = {
        "type": "OBJECT",
        "properties": {
            "overall_score": {"type": "INTEGER"},
            "summary": {"type": "STRING"},
            "recommendation": {"type": "STRING", "enum": ["HIRE", "STRONG MAYBE", "NO HIRE"]},
            "swot": {
                "type": "OBJECT",
                "properties": {
                    "strengths": {"type": "ARRAY", "items": {"type": "STRING"}},
                    "weaknesses": {"type": "ARRAY", "items": {"type": "STRING"}},
                    "opportunities": {"type": "ARRAY", "items": {"type": "STRING"}},
                    "threats": {"type": "ARRAY", "items": {"type": "STRING"}}
                },
                "required": ["strengths", "weaknesses", "opportunities", "threats"]
            }
        },
        "required": ["overall_score", "summary", "recommendation", "swot"]
    }
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=gemini_schema
            )
        )
        
        verdict_data = json.loads(response.text)
        
        # Map string recommendation to Enum
        rec_str = verdict_data["recommendation"]
        rec_enum = DecisionEnum.HIRE if rec_str == "HIRE" else DecisionEnum.MAYBE if rec_str == "STRONG MAYBE" else DecisionEnum.NO_HIRE
        
        # UPSERT: update existing verdict if one already exists (e.g. resume-only preliminary)
        existing = db.query(DecisionVerdict).filter(DecisionVerdict.application_id == application_id).first()
        if existing:
            existing.recommendation = rec_enum
            existing.summary = verdict_data["summary"]
            existing.swot_analysis = verdict_data["swot"]
            existing.overall_score = verdict_data["overall_score"]
        else:
            verdict_record = DecisionVerdict(
                application_id=application_id,
                recommendation=rec_enum,
                summary=verdict_data["summary"],
                swot_analysis=verdict_data["swot"],
                overall_score=verdict_data["overall_score"]
            )
            db.add(verdict_record)
        
        db.commit()
        print(f"Decision Agent completed verdict for Application {application_id} with recommendation: {rec_enum}")
        
    except Exception as e:
        print(f"Decision Agent failed for Application {application_id}: {str(e)}")
        db.rollback()