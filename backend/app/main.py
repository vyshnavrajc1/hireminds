# app/main.py
from fastapi import FastAPI
from app.api.routes import jobroute, auth, applicationroute
from app.db.session import engine, Base
from app.models import user, job, application, fairness_audit, decision_verdict, interview_evaluation
from fastapi.middleware.cors import CORSMiddleware




# Create all tables in the database
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Recruitment Platform")

# Include the authentication router
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(jobroute.router, prefix="/api/jobs", tags=["Jobs"])
app.include_router(applicationroute.router, prefix="/api/applications", tags=["Applications"])


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # your frontend
    ],
    allow_credentials=True,
    allow_methods=["*"],  # GET, POST, PUT, DELETE
    allow_headers=["*"],  # allow all headers
)


# Include your existing routers
# app.include_router(candidates.router, prefix="/api/candidates", tags=["Candidates"])
# etc...