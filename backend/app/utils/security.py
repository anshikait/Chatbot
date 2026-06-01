"""
app/utils/security.py — JWT and password hashing utilities
Fixed: Bcrypt 72-byte password limit + backward compatibility
"""

import os
from datetime import datetime, timedelta
from typing import Optional
import jwt
from passlib.context import CryptContext

# ─────────────────────────────────────────────────────────────
# Password Context (Bcrypt)
# ─────────────────────────────────────────────────────────────

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12
)

# ─────────────────────────────────────────────────────────────
# Password Hashing — WITH 72-BYTE LIMIT FIX
# ─────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """
    Hash a password for storage.
    
    ⚠️ IMPORTANT: Bcrypt has a 72-byte limit
    Passwords longer than 72 bytes are truncated
    """
    # ✅ Truncate to 72 bytes to avoid bcrypt error
    password_truncated = password[:72]
    
    if len(password) > 72:
        print(f"⚠️ WARNING: Password truncated from {len(password)} to 72 bytes")
    
    return pwd_context.hash(password_truncated)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against its hash.
    
    ⚠️ IMPORTANT: Must apply same 72-byte truncation
    """
    # ✅ Truncate to 72 bytes (same as hashing)
    plain_truncated = plain_password[:72]
    
    return pwd_context.verify(plain_truncated, hashed_password)


# ─────────────────────────────────────────────────────────────
# JWT Token Generation
# ─────────────────────────────────────────────────────────────

JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7


def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token valid for 7 days.
    """
    if expires_delta is None:
        expires_delta = timedelta(days=JWT_EXPIRATION_DAYS)
    
    expire = datetime.utcnow() + expires_delta
    
    payload = {
        "sub": user_id,
        "type": "access",
        "exp": expire,
        "iat": datetime.utcnow()
    }
    
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def decode_access_token(token: str) -> Optional[str]:
    """
    Decode and validate an access token.
    Returns user_id if valid, None if invalid.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        # Verify token type
        if payload.get("type") != "access":
            return None
        
        user_id = payload.get("sub")
        return user_id
    except jwt.ExpiredSignatureError:
        print("Token has expired")
        return None
    except jwt.InvalidTokenError:
        print("Invalid token")
        return None


# ✅ BACKWARD COMPATIBILITY ALIAS
# auth.py uses decode_token(), so we alias it to decode_access_token()
decode_token = decode_access_token


# ─────────────────────────────────────────────────────────────
# JWT Reset Token (for password reset)
# ─────────────────────────────────────────────────────────────

RESET_TOKEN_EXPIRATION_MINUTES = 15


def create_reset_token(email: str) -> str:
    """
    Create a password reset token valid for 15 minutes.
    """
    expire = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRATION_MINUTES)
    
    payload = {
        "sub": email,
        "type": "reset",  # ✅ Different type to prevent misuse
        "exp": expire,
        "iat": datetime.utcnow()
    }
    
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def decode_reset_token(token: str) -> Optional[str]:
    """
    Decode and validate a reset token.
    Returns email if valid, None if invalid.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        # ✅ Verify token type is "reset" (not "access")
        if payload.get("type") != "reset":
            print("Not a reset token")
            return None
        
        email = payload.get("sub")
        return email
    except jwt.ExpiredSignatureError:
        print("Reset token has expired")
        return None
    except jwt.InvalidTokenError:
        print("Invalid reset token")
        return None