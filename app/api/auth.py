from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database.db import get_db
from app.services.auth_service import (
    create_user,
    authenticate_user,
    get_user_by_email,
    create_access_token,
    decode_token
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter()
bearer = HTTPBearer()


# ── Schemas ──
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


# ── Dependency: Get current user from token ──
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    payload = decode_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    user = get_user_by_email(db, payload.get("email"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    return user


# ── Register ──
@router.post("/auth/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing = get_user_by_email(db, request.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")

    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    user = create_user(db, request.name, request.email, request.password)
    token = create_access_token({"email": user.email, "name": user.name})

    return {
        "message": "Account created successfully ✅",
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }


# ── Login ──
@router.post("/auth/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token({"email": user.email, "name": user.name})

    return {
        "message": "Login successful ✅",
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }


# ── Get Current User ──
@router.get("/auth/me")
def get_me(current_user=Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "created_at": current_user.created_at
    }