from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any

class UserAuth(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=64)

class UserProfile(BaseModel):
    name: str
    age: int
    gender: str
    city: str
    state: str
    preferred_language: str = "English"
    allergies: str = ""
    chronic_conditions: str = ""
    medications: str = ""
    smoking_status: str = "No"
    alcohol_status: str = "No"
    sleep_pattern: str = ""
    diet_pattern: str = ""
    exercise_level: str = ""
    previous_surgeries: str = ""
    family_history: str = ""
    emergency_contact: str = ""

class ChatRequest(BaseModel):
    message: Optional[str] = None
    language: str = "English"