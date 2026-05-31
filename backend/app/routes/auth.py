"""
auth.py — Authentication router
Routes:
  POST /register          – create account
  POST /login             – get JWT
  POST /logout            – blacklist token
  POST /forgot-password   – send reset link (returns token in dev; email in prod)
  POST /reset-password    – consume token, set new password
"""

import datetime
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from bson import ObjectId

from app.models.schemas import UserAuth
from app.services.mongo_service import users_collection, profiles_collection
from app.utils.security import (
    hash_password, verify_password,
    create_access_token, decode_token,
    create_reset_token, decode_reset_token,
)

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# ── In-memory token blacklist (swap for Redis in production) ──────────────────
_blacklisted_tokens: set[str] = set()


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic schemas (local, auth-only)
# ─────────────────────────────────────────────────────────────────────────────
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# ─────────────────────────────────────────────────────────────────────────────
# REGISTER
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/register")
async def register(user: UserAuth):
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    new_user = users_collection.insert_one({
        "name":       user.name,
        "email":      user.email,
        "password":   hash_password(user.password),
        "created_at": datetime.datetime.utcnow(),
    })

    profiles_collection.insert_one({
        "user_id":            str(new_user.inserted_id),
        "name":               user.name,
        "age":                None,
        "preferred_language": "English",
    })

    return {"message": "Account created successfully. Please sign in."}


# ─────────────────────────────────────────────────────────────────────────────
# LOGIN
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db_user = users_collection.find_one({"email": form_data.username})

    if not db_user or not verify_password(form_data.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token({"sub": str(db_user["_id"])})
    return {"access_token": token, "token_type": "bearer"}


# ─────────────────────────────────────────────────────────────────────────────
# LOGOUT  — blacklist the current token
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/logout")
async def logout(token: str = Depends(oauth2_scheme)):
    _blacklisted_tokens.add(token)
    return {"message": "Logged out successfully."}


# ─────────────────────────────────────────────────────────────────────────────
# FORGOT PASSWORD  — generate + return reset token
# In production replace the return value with an email delivery call.
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest):
    user = users_collection.find_one({"email": body.email})

    # Always return 200 so we don't leak whether the email exists
    if not user:
        return {"message": "If that email is registered, a reset link has been sent."}

    reset_token = create_reset_token(body.email)

    # ── TODO (production): send email with link ────────────────────────────
    # e.g. send_email(body.email, f"https://yourapp.com/reset-password?token={reset_token}")
    # For development we return the token directly so the frontend can use it:
    return {
        "message": "Reset token generated. Check your email (or use the token below in dev).",
        "reset_token": reset_token,   # REMOVE in production
    }


# ─────────────────────────────────────────────────────────────────────────────
# RESET PASSWORD  — consume token, save new hash
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest):
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    email = decode_reset_token(body.token)
    if not email:
        raise HTTPException(status_code=400, detail="Reset link is invalid or has expired.")

    result = users_collection.update_one(
        {"email": email},
        {"$set": {"password": hash_password(body.new_password)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Account not found.")

    return {"message": "Password updated successfully. You can now sign in."}


# ─────────────────────────────────────────────────────────────────────────────
# get_current_user  — dependency used by other routers
# ─────────────────────────────────────────────────────────────────────────────
def get_current_user(token: str = Depends(oauth2_scheme)):
    if token in _blacklisted_tokens:
        raise HTTPException(status_code=401, detail="Token has been revoked. Please log in again.")

    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    return payload["sub"]
