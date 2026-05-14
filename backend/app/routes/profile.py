# routes/profile.py
from app.routes.auth import get_current_user
from fastapi import APIRouter, Depends
from app.models.schemas import UserProfile
from app.services.mongo_service import profiles_collection

router = APIRouter()

@router.post("/")
async def update_profile(profile: UserProfile, user_id: str = Depends(get_current_user)):
    profile_dict = profile.dict()
    profile_dict["user_id"] = user_id
    profiles_collection.update_one({"user_id": user_id}, {"$set": profile_dict}, upsert=True)
    return {"message": "Profile updated successfully"}

@router.get("/")
async def get_profile(user_id: str = Depends(get_current_user)):
    profile = profiles_collection.find_one({"user_id": user_id}, {"_id": 0})
    return profile or {}