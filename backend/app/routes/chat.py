import uuid
import datetime
import base64
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from app.routes.auth import get_current_user
from app.services.speech_service import transcribe_audio
from app.services.rag_service import build_rag_prompt
from app.services.groq_service import generate_medical_response
from app.services.tts_service import text_to_speech_base64
from app.services.mongo_service import chats_collection
from app.services.pinecone_service import upsert_embedding

router = APIRouter()

# 🆕 NEW: Get all chat sessions for the sidebar
@router.get("/sessions")
async def get_chat_sessions(user_id: str = Depends(get_current_user)):
    # Group messages by session_id to create a list of chats
    pipeline =[
        {"$match": {"user_id": user_id, "session_id": {"$exists": True}}},
        {"$group": {
            "_id": "$session_id",
            "title": {"$first": "$message"},  # First message becomes the chat title
            "last_updated": {"$max": "$created_at"}
        }},
        {"$sort": {"last_updated": -1}}
    ]
    sessions = list(chats_collection.aggregate(pipeline))
    
    # Format the titles to be short (max 30 chars)
    formatted_sessions =[]
    for s in sessions:
        title = s["title"] if s["title"] else "Audio/Image Upload"
        title = title[:30] + "..." if len(title) > 30 else title
        formatted_sessions.append({"session_id": s["_id"], "title": title})
        
    return formatted_sessions

# 🔄 MODIFIED: Fetch chat history for a specific session
@router.get("/history")
async def get_chat_history(session_id: str = Query(...), user_id: str = Depends(get_current_user)):
    chats = list(chats_collection.find(
        {"user_id": user_id, "session_id": session_id}, 
        {"_id": 0}
    ).sort("created_at", 1)) # Ascending order for UI
    return chats

# 🔄 MODIFIED: Main Chat route handles session_id
@router.post("/")
async def chat(
    message: str = Form(None),
    language: str = Form("English"),
    session_id: str = Form(None), # 🆕 NEW PARAMETER
    audio: UploadFile = File(None),
    image: UploadFile = File(None),
    user_id: str = Depends(get_current_user)
):
    user_query = message or ""
    
    if audio:
        audio_bytes = await audio.read()
        user_query = transcribe_audio(audio_bytes, audio.filename)
        
    base64_image = None
    if image:
        image_bytes = await image.read()
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        user_query = user_query or "Please analyze this image."

    if not user_query and not base64_image:
        return {"error": "No input provided"}

    # 🆕 Generate a new session_id if this is the first message in a new chat
    if not session_id or session_id == "null":
        session_id = str(uuid.uuid4())

    # Save to MongoDB with session_id
    chats_collection.insert_one({
        "user_id": user_id, 
        "session_id": session_id,
        "message": user_query, 
        "has_image": bool(image), 
        "created_at": datetime.datetime.utcnow()
    })
    
    # Global User Memory (Pinecone)
    upsert_embedding(user_id, "chat", f"User asks: {user_query}")

    # Generate Response
    system_prompt = build_rag_prompt(user_id, user_query, language)
    llm_output = generate_medical_response(system_prompt, user_query, base64_image)
    
    response_text = llm_output.get("response", "Error generating response")
    risk_level = llm_output.get("risk_level", "LOW")
    explainability = llm_output.get("explainability", "")
    needs_map = llm_output.get("needs_map", False)

    audio_base64 = text_to_speech_base64(response_text, language)

    # Save Bot Response to MongoDB with session_id
    chats_collection.insert_one({
        "user_id": user_id, 
        "session_id": session_id,
        "response": response_text, 
        "risk": risk_level, 
        "needs_map": needs_map,
        "audio_base64": audio_base64, # Save audio to avoid regenerating later
        "created_at": datetime.datetime.utcnow()
    })
    
    upsert_embedding(user_id, "reply", f"AI answered: {response_text}")

    return {
        "session_id": session_id, # 🆕 Send back the session ID so React tracks it
        "query": user_query,
        "response": response_text,
        "risk_level": risk_level,
        "explainability": explainability,
        "needs_map": needs_map,
        "audio_base64": audio_base64
    }