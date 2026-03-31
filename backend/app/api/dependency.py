# app/api/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.core.config import settings
from app.models.user import UserRole

# Tell FastAPI where the login URL is for the interactive docs
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user_role(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        role: str = payload.get("role")
        if role is None:
            raise credentials_exception
        return role
    except JWTError:
        raise credentials_exception

# --- Role Validators to inject into your routes ---

def require_hr(role: str = Depends(get_current_user_role)):
    if role not in [UserRole.hr]:
        raise HTTPException(status_code=403, detail="Not enough privileges. HR access required.")
    return role

def require_candidate(role: str = Depends(get_current_user_role)):
    if role != UserRole.candidate:
        raise HTTPException(status_code=403, detail="Only candidates can perform this action.")
    return role