# app/db/session.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# 1. Create the SQLAlchemy Engine
# The engine is the core interface to the database.
engine = create_engine(settings.DATABASE_URL)

# 2. Create a SessionLocal class
# Each instance of this class will be an actual database session.
# We disable autocommit and autoflush so we can control when data is saved.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Create the Base class
# All of your database models (like User, Candidate, etc.) will inherit from this.
Base = declarative_base()

# 4. Create the Database Dependency
# This function creates an independent database session for each incoming API request
# and ensures it gets closed after the request is finished.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()