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


# ─────────────────────────────────────────────────────────────
# GET /sessions  — sidebar session list
# ─────────────────────────────────────────────────────────────
@router.get("/sessions")
async def get_chat_sessions(user_id: str = Depends(get_current_user)):
    pipeline = [
        {"$match": {"user_id": user_id, "session_id": {"$exists": True}}},
        {"$group": {
            "_id": "$session_id",
            "title": {"$first": "$message"},
            "last_updated": {"$max": "$created_at"}
        }},
        {"$sort": {"last_updated": -1}}
    ]
    sessions = list(chats_collection.aggregate(pipeline))
    formatted = []
    for s in sessions:
        title = s["title"] if s["title"] else "Audio / Image Upload"
        title = title[:30] + "..." if len(title) > 30 else title
        formatted.append({"session_id": s["_id"], "title": title})
    return formatted


# ─────────────────────────────────────────────────────────────
# GET /history  — messages for a session
# ─────────────────────────────────────────────────────────────
@router.get("/history")
async def get_chat_history(
    session_id: str = Query(...),
    user_id: str = Depends(get_current_user)
):
    chats = list(chats_collection.find(
        {"user_id": user_id, "session_id": session_id},
        {"_id": 0}
    ).sort("created_at", 1))
    return chats


# ─────────────────────────────────────────────────────────────
# POST /  — main chat endpoint
# ─────────────────────────────────────────────────────────────
@router.post("/")
async def chat(
    message:    str        = Form(None),
    language:   str        = Form("English"),
    session_id: str        = Form(None),
    audio:      UploadFile = File(None),
    image:      UploadFile = File(None),   # skin photo / scan
    report:     UploadFile = File(None),   # ← NEW: lab report / PDF
    user_id:    str        = Depends(get_current_user)
):
    user_query  = message or ""
    has_image   = False
    has_report  = False
    base64_image = None
    image_mime   = "image/jpeg"

    # ── 1. Audio transcription ───────────────────────────────
    if audio:
        audio_bytes = await audio.read()
        user_query  = transcribe_audio(audio_bytes, audio.filename)

    # ── 2. Skin image / scan ─────────────────────────────────
    if image:
        image_bytes  = await image.read()
        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        has_image    = True

        fname = (image.filename or "").lower()
        if fname.endswith(".png"):        image_mime = "image/png"
        elif fname.endswith(".webp"):     image_mime = "image/webp"
        elif fname.endswith(".gif"):      image_mime = "image/gif"
        else:                             image_mime = "image/jpeg"

        if not user_query:
            user_query = "Please analyze this medical image and provide a detailed assessment."

    # ── 3. Report upload (PDF or image) ─────────────────────
    if report:
        report_bytes = await report.read()
        fname        = (report.filename or "").lower()
        has_report   = True

        if fname.endswith(".pdf"):
            # PDFs: send as document to the vision model via base64 image of first page
            # We treat it as a base64 payload with PDF mime — Groq vision handles it
            base64_image = base64.b64encode(report_bytes).decode("utf-8")
            image_mime   = "application/pdf"
            has_image    = True   # reuse vision pipeline
        else:
            # Image-based report (photo of a report / scan)
            base64_image = base64.b64encode(report_bytes).decode("utf-8")
            if fname.endswith(".png"):    image_mime = "image/png"
            elif fname.endswith(".webp"): image_mime = "image/webp"
            else:                         image_mime = "image/jpeg"
            has_image = True

        if not user_query:
            user_query = "Please analyze this medical report and explain all findings in detail."

    # ── 4. Guard ─────────────────────────────────────────────
    if not user_query and not base64_image:
        return {"error": "No input provided. Please send a message, audio, image, or report."}

    # ── 5. Session management ─────────────────────────────────
    if not session_id or session_id == "null":
        session_id = str(uuid.uuid4())

    # ── 6. Save user message ──────────────────────────────────
    chats_collection.insert_one({
        "user_id":    user_id,
        "session_id": session_id,
        "message":    user_query,
        "has_image":  has_image,
        "has_report": has_report,
        "created_at": datetime.datetime.utcnow()
    })

    upsert_embedding(user_id, "chat", f"User asks: {user_query}")

    # ── 7. Build RAG prompt ───────────────────────────────────
    system_prompt = build_rag_prompt(
        user_id=user_id,
        query=user_query,
        language=language,
        has_report=has_report,
        has_image=has_image,
    )

    # ── 8. Generate AI response ───────────────────────────────
    llm_output = generate_medical_response(
        system_prompt=system_prompt,
        user_query=user_query,
        base64_image=base64_image,
        image_mime=image_mime,
    )

    response_text  = llm_output.get("response",      "Error generating response")
    risk_level     = llm_output.get("risk_level",     "LOW")
    explainability = llm_output.get("explainability", "")
    needs_map      = llm_output.get("needs_map",      False)
    image_type     = llm_output.get("image_type",     "NONE")

    # Override image_type for reports so frontend shows correct badge
    if has_report and image_type == "NONE":
        image_type = "PDF_REPORT"

    # ── 9. TTS ────────────────────────────────────────────────
    audio_base64 = text_to_speech_base64(response_text, language)

    # ── 10. Save bot response ─────────────────────────────────
    chats_collection.insert_one({
        "user_id":      user_id,
        "session_id":   session_id,
        "response":     response_text,
        "risk":         risk_level,
        "image_type":   image_type,
        "needs_map":    needs_map,
        "audio_base64": audio_base64,
        "created_at":   datetime.datetime.utcnow()
    })

    upsert_embedding(user_id, "reply", f"AI answered: {response_text}")

    # ── 11. Return ────────────────────────────────────────────
    return {
        "session_id":    session_id,
        "query":         user_query,
        "response":      response_text,
        "risk_level":    risk_level,
        "explainability": explainability,
        "needs_map":     needs_map,
        "image_type":    image_type,
        "audio_base64":  audio_base64,
    }
