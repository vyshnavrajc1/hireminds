from sqlalchemy import Column, Integer, String, Boolean, Enum
from app.db.session import Base
import enum

class UserRole(str, enum.Enum):
    candidate = "candidate"
    hr = "hr"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True) 