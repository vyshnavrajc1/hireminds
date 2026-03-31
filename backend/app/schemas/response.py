# app/schemas/response.py
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: UserRole
    is_active: bool

    class Config:
        from_attributes = True # Allows Pydantic to read SQLAlchemy models

class Token(UserResponse):
    access_token: str
    token_type: str