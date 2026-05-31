"""
chat.py — Main chat router with improved PDF handling
Uses: PyPDF (text extraction) + PyMuPDF/fitz (image rendering)
Auto-fills user location for clinic/hospital queries
"""

import uuid
import datetime
import base64
import io
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from app.routes.auth import get_current_user
from app.services.speech_service import transcribe_audio
from app.services.rag_service import build_rag_prompt
from app.services.groq_service import generate_medical_response
from app.services.tts_service import text_to_speech_base64
from app.services.mongo_service import chats_collection, profiles_collection
from app.services.pinecone_service import upsert_embedding

router = APIRouter()


def extract_pdf_content(pdf_bytes: bytes) -> dict:
    """
    Extract content from PDF using multiple strategies.
    Returns: {
        "text": extracted_text_or_error_msg,
        "image_base64": base64_image_of_first_page_or_none,
        "image_mime": "image/jpeg" or None,
        "success": bool
    }
    """
    result = {
        "text": "",
        "image_base64": None,
        "image_mime": "image/jpeg",
        "success": False
    }

    # ─────────────────────────────────────────────────────────────
    # Strategy 1: PyMuPDF (fitz) — render first page as JPEG image
    # ─────────────────────────────────────────────────────────────
    try:
        import fitz  # PyMuPDF
        pdf_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        if len(pdf_doc) > 0:
            # Render first page at 150 DPI (300x400 @ DPI → ~1200x1600 pixels)
            page = pdf_doc[0]
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)  # 2x zoom
            
            # Convert to JPEG
            img_bytes = pix.tobytes("jpeg")
            result["image_base64"] = base64.b64encode(img_bytes).decode("utf-8")
            result["image_mime"] = "image/jpeg"
            print(f"[PDF] ✅ Rendered first page to JPEG via PyMuPDF ({len(img_bytes)} bytes)")
        
        pdf_doc.close()
    except Exception as e:
        print(f"[PDF] PyMuPDF image rendering failed: {e}")

    # ─────────────────────────────────────────────────────────────
    # Strategy 2: PyPDF — extract text from all pages
    # ─────────────────────────────────────────────────────────────
    try:
        from pypdf import PdfReader
        pdf_reader = PdfReader(io.BytesIO(pdf_bytes))
        
        text_parts = []
        num_pages = len(pdf_reader.pages)
        
        # Extract text from first 5 pages (avoid huge PDFs)
        for page_num in range(min(5, num_pages)):
            try:
                page = pdf_reader.pages[page_num]
                text = page.extract_text() or ""
                if text.strip():
                    text_parts.append(f"--- Page {page_num + 1} ---\n{text}")
            except Exception as pe:
                print(f"[PDF] Error extracting page {page_num}: {pe}")
                continue
        
        if text_parts:
            extracted_text = "\n\n".join(text_parts)
            result["text"] = extracted_text
            result["success"] = True
            print(f"[PDF] ✅ Extracted {len(extracted_text)} chars via PyPDF from {num_pages} pages")
            return result
    except Exception as e:
        print(f"[PDF] PyPDF text extraction failed: {e}")

    # ─────────────────────────────────────────────────────────────
    # Strategy 3: pdfplumber — structured text extraction
    # ─────────────────────────────────────────────────────────────
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            text_parts = []
            
            for page_num, page in enumerate(pdf.pages[:5]):
                try:
                    text = page.extract_text() or ""
                    tables = page.extract_tables()
                    
                    if text.strip():
                        text_parts.append(f"--- Page {page_num + 1} ---\n{text}")
                    
                    if tables:
                        text_parts.append(f"[Tables found on page {page_num + 1}]")
                except Exception as pe:
                    print(f"[PDF] pdfplumber page {page_num} failed: {pe}")
                    continue
            
            if text_parts:
                extracted_text = "\n\n".join(text_parts)
                result["text"] = extracted_text
                result["success"] = True
                print(f"[PDF] ✅ Extracted via pdfplumber ({len(extracted_text)} chars)")
                return result
    except Exception as e:
        print(f"[PDF] pdfplumber failed: {e}")

    # ─────────────────────────────────────────────────────────────
    # Fallback: If we have image but no text
    # ─────────────────────────────────────────────────────────────
    if result["image_base64"]:
        result["text"] = "[PDF rendered as image — visual content analyzed by AI]"
        result["success"] = True
        print("[PDF] ✅ Falling back to image-only mode")
        return result

    # Everything failed
    result["text"] = "⚠️ Could not extract text from PDF. Please try uploading as JPG/PNG instead."
    result["success"] = False
    print("[PDF] ❌ All extraction methods failed")
    return result


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
    image:      UploadFile = File(None),
    report:     UploadFile = File(None),
    user_id:    str        = Depends(get_current_user)
):
    user_query   = message or ""
    has_image    = False
    has_report   = False
    base64_image = None
    image_mime   = "image/jpeg"
    user_location = {}  # Will be populated from profile

    # ── Retrieve user location from profile ──────────────────
    try:
        profile = profiles_collection.find_one({"user_id": user_id})
        if profile:
            user_location = {
                "city": profile.get("city", ""),
                "state": profile.get("state", ""),
                "country": "India",  # Adjust if needed
            }
    except Exception as e:
        print(f"[PROFILE] Could not fetch location: {e}")

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
        if fname.endswith(".png"):    image_mime = "image/png"
        elif fname.endswith(".webp"): image_mime = "image/webp"
        elif fname.endswith(".gif"):  image_mime = "image/gif"
        else:                         image_mime = "image/jpeg"

        if not user_query:
            user_query = "Please analyze this medical image and provide a detailed assessment."

    # ── 3. Report upload (PDF or image) ─────────────────────
    if report:
        report_bytes = await report.read()
        fname        = (report.filename or "").lower()
        has_report   = True

        if fname.endswith(".pdf"):
            # ✅ USE PyPDF + PyMuPDF for PDF extraction
            pdf_content = extract_pdf_content(report_bytes)
            
            if pdf_content["image_base64"]:
                base64_image = pdf_content["image_base64"]
                image_mime   = pdf_content["image_mime"]
                has_image    = True
            
            # Prepend extracted text to the query
            if pdf_content["text"]:
                user_query = f"{pdf_content['text']}\n\n{user_query}".strip()
            
            if not user_query:
                user_query = "Please analyze this medical report and explain all findings in detail."
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

    # ✅ Auto-fill location context if asking about clinics/hospitals
    if user_location.get("city") and user_location.get("state"):
        location_keywords = ["clinic", "hospital", "doctor", "nearby", "near me", "location", "appointment"]
        if any(kw in user_query.lower() for kw in location_keywords):
            system_prompt += f"\n\nNote: The user is located in {user_location['city']}, {user_location['state']}, {user_location['country']}. Provide clinic/hospital recommendations relevant to their location."

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
        "session_id":     session_id,
        "query":          user_query,
        "response":       response_text,
        "risk_level":     risk_level,
        "explainability": explainability,
        "needs_map":      needs_map,
        "image_type":     image_type,
        "audio_base64":   audio_base64,
        "user_location":  user_location,  # ✅ Pass location to frontend
    }