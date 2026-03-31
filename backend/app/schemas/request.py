# app/schemas/request.py
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    role: UserRole
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    role: UserRole
    password: str

class JobCreate(BaseModel):
    title: str
    