# routes/report.py
from fastapi import APIRouter, Depends, UploadFile, File
from app.services.ocr_service import extract_text_from_file
from app.services.pinecone_service import upsert_embedding
from app.services.mongo_service import reports_collection
from app.routes.auth import get_current_user
import datetime

router = APIRouter()

@router.post("/upload")
async def upload_report(file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    file_bytes = await file.read()
    extracted_text = extract_text_from_file(file_bytes, file.filename)
    
    if not extracted_text:
        return {"error": "Could not extract text from report"}

    reports_collection.insert_one({
        "user_id": user_id,
        "filename": file.filename,
        "extracted_text": extracted_text,
        "uploaded_at": datetime.datetime.now()
    })

    # Store in Pinecone for RAG
    upsert_embedding(user_id, "report", f"Medical Report ({file.filename}): {extracted_text}")

    return {"message": "Report analyzed and stored successfully", "text_preview": extracted_text[:200]}