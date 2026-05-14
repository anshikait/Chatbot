from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm
from app.models.schemas import UserAuth
from app.services.mongo_service import users_collection, profiles_collection
from app.utils.security import hash_password, verify_password, create_access_token
import datetime

router = APIRouter()

@router.post("/register")
async def register(user: UserAuth):
    # 1. Check if user exists
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="User already exists")
    # 2. Create new user
    new_user = users_collection.insert_one({
        "name": user.name,
        "email": user.email,
        "password": hash_password(user.password),
        "created_at": datetime.datetime.utcnow()
    })
    # 3. Auto-initialize their Profile with their name
    profiles_collection.insert_one({
        "user_id": str(new_user.inserted_id),
        "name": user.name,
        "age": None, # Kept null so we can enforce profile completion later
        "preferred_language": "English"
    })
    return {"message": "User registered successfully"}

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # FastAPI maps 'username' from the form to 'form_data.username'
    # We will pass the user's email into this username field from React
    db_user = users_collection.find_one({"email": form_data.username})
    
    if not db_user or not verify_password(form_data.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": str(db_user["_id"])})
    return {"access_token": token, "token_type": "bearer"}

# Dependency to get current user
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme)):
    from app.utils.security import decode_token
    payload = decode_token(token)
    if not payload: raise HTTPException(status_code=401)
    return payload["sub"]