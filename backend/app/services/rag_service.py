# app/services/rag_service.py
from app.services.pinecone_service import search_embeddings
from app.services.mongo_service import profiles_collection
from app.services.retrieval_router import retrieve_layered_context


def detect_wellness_intent(query: str) -> bool:
    """Detects if user explicitly wants natural or traditional remedies."""
    wellness_keywords = [
        "ayurved", "home remedy", "natural", "herbal", "tulsi",
        "yoga", "traditional", "homeopathic"
    ]
    return any(word in query.lower() for word in wellness_keywords)


def build_rag_prompt(
    user_id: str,
    query: str,
    language: str,
    has_report: bool = False,
    has_image: bool = False
) -> str:
    """
    Builds a layered RAG system prompt using:
    - Clinical Evidence (Pinecone)
    - Wellness Knowledge (optional)
    - User Memory
    - User Profile
    - Image / Report context flags
    """

    # =========================================================
    # 1. RETRIEVE LAYERED CONTEXT
    # =========================================================
    contexts = retrieve_layered_context(query, user_id)

    clinical_context  = contexts.get("clinical_evidence", [])
    wellness_context  = contexts.get("wellness_advice", [])
    memory_context    = contexts.get("user_history", [])

    clinical_text = "\n---\n".join(clinical_context)
    wellness_text = "\n---\n".join(wellness_context)
    memory_text   = "\n---\n".join(memory_context)

    # =========================================================
    # 2. FETCH USER PROFILE
    # =========================================================
    profile = profiles_collection.find_one(
        {"user_id": user_id},
        {"_id": 0, "user_id": 0}
    )

    if profile:
        profile_text = "\n".join([f"{k}: {v}" for k, v in profile.items()])
    else:
        profile_text = "No profile data available."

    has_wellness = len(wellness_context) > 0

    # =========================================================
    # 3. BUILD BASE SYSTEM PROMPT
    # =========================================================
    system_prompt = f"""
You are a senior, safe, multilingual, and highly empathetic AI Medical Assistant.

Your role is to provide:
- Evidence-based clinical guidance
- Safe symptom understanding
- Personalized healthcare responses
- Conversational and comforting interactions
- Traditional wellness support ONLY when requested

====================================================
USER PROFILE
====================================================

{profile_text}
*(If relevant, use the user's city/location to infer weather or environmental factors.)*

====================================================
PATIENT HISTORY & MEMORY
====================================================

{memory_text if memory_text else "No previous history available."}

====================================================
CLINICAL EVIDENCE (PRIMARY SOURCE)
====================================================

{clinical_text if clinical_text else "No clinical evidence retrieved."}
"""

    # =========================================================
    # 4. OPTIONAL WELLNESS SECTION
    # =========================================================
    if has_wellness:
        system_prompt += f"""

====================================================
TRADITIONAL WELLNESS SUPPORT (SECONDARY SOURCE)
====================================================

{wellness_text}

IMPORTANT:
Traditional wellness suggestions are supportive only.
They are NOT replacements for evidence-based medical treatment.
"""

    # =========================================================
    # 5. IMAGE ANALYSIS INSTRUCTIONS (if image uploaded)
    # =========================================================
    if has_image:
        system_prompt += """

====================================================
IMAGE ANALYSIS CONTEXT
====================================================

An image has been uploaded by the patient. You will receive specialised
image-analysis instructions separately. Use the patient profile and history
above as additional context to personalise your image analysis response.

For example:
- If the patient has diabetes and uploads a skin image → mention diabetic skin complications
- If the patient has hypertension and uploads a lab report → highlight BP-related values
- Always connect your image findings back to the patient's known medical history.
"""

    # =========================================================
    # 6. REPORT ANALYSIS INSTRUCTIONS (if report uploaded)
    # =========================================================
    if has_report:
        system_prompt += """

====================================================
MEDICAL REPORT CONTEXT
====================================================

A medical report/document has been uploaded. When analyzing:
1. Extract ALL values and measurements visible
2. Compare against standard reference ranges
3. Highlight abnormal values clearly
4. Relate findings to the patient's known conditions and profile
5. Provide actionable recommendations
6. Explain everything in simple, patient-friendly language
"""

    # =========================================================
    # 7. GENERAL CONVERSATION INSTRUCTIONS
    # =========================================================
    system_prompt += f"""

====================================================
CONVERSATION INSTRUCTIONS
====================================================

1. IF the user expresses thanks or satisfaction:
   - Respond warmly and invite further questions mandatorily.

2. IF the user describes symptoms or asks a medical question:
   - Explain possible causes (consider profile: location, age, conditions)
   - Suggest treatment based on CLINICAL EVIDENCE
   - Ask a helpful follow-up question always to keep the conversation going.

3. IF a Medical Report was uploaded (Flag: {has_report}):
   - Summarize the report, explain abnormal values, suggest next steps.

4. IF an Image was uploaded (Flag: {has_image}):
   - The specialised image prompt handles analysis.
   - Use patient profile to add personalised context to findings.

5. Use CLINICAL EVIDENCE as PRIMARY source. Wellness is supplementary only.

6. Keep tone warm, conversational, and comforting.

7. Respond STRICTLY in: {language}

====================================================
USER QUERY
====================================================

{query}
"""

    return system_prompt
