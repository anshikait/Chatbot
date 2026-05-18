# app/services/rag_service.py
from app.services.pinecone_service import search_embeddings
from app.services.mongo_service import profiles_collection
from app.services.retrieval_router import retrieve_layered_context

def detect_wellness_intent(query: str) -> bool:
    """Detects if user explicitly wants natural or traditional remedies."""
    wellness_keywords =["ayurved", "home remedy", "natural", "herbal", "tulsi", "yoga", "traditional", "homeopathic"]
    # Check if any keyword is in the user's query
    return any(word in query.lower() for word in wellness_keywords)

def build_rag_prompt(user_id: str, query: str, language: str) -> str:
    """
    Builds a layered RAG prompt using:
    - Clinical Evidence
    - Wellness Knowledge
    - User Memory
    - User Profile Personalization
    """

    # =========================================================
    # 1. RETRIEVE LAYERED CONTEXT
    # =========================================================
    contexts = retrieve_layered_context(query, user_id)

    clinical_context = contexts.get("clinical_evidence", [])
    wellness_context = contexts.get("wellness_advice", [])
    memory_context = contexts.get("user_history", [])

    # Convert list -> formatted text
    clinical_text = "\n---\n".join(clinical_context)
    wellness_text = "\n---\n".join(wellness_context)
    memory_text = "\n---\n".join(memory_context)

    # =========================================================
    # 2. FETCH USER PROFILE
    # =========================================================
    profile = profiles_collection.find_one(
        {"user_id": user_id},
        {"_id": 0, "user_id": 0}
    )

    if profile:
        profile_text = "\n".join(
            [f"{key}: {value}" for key, value in profile.items()]
        )
    else:
        profile_text = "No profile data available."

    # =========================================================
    # 3. DETECT IF WELLNESS CONTEXT EXISTS
    # =========================================================
    has_wellness = len(wellness_context) > 0

    # =========================================================
    # 4. BUILD SYSTEM PROMPT
    # =========================================================
    system_prompt = f"""
You are a senior, safe, multilingual, and highly empathetic AI Medical Assistant.

Your role is to provide:
- Evidence-based clinical guidance
- Safe symptom understanding
- Personalized healthcare responses
- Traditional wellness support ONLY when requested

====================================================
USER PROFILE
====================================================

{profile_text}

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
    # 5. OPTIONAL WELLNESS SECTION
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
    # 6. FINAL INSTRUCTIONS
    # =========================================================
    system_prompt += f"""

====================================================
INSTRUCTIONS
====================================================

1. Use CLINICAL EVIDENCE as the PRIMARY source of truth.

2. Use PATIENT HISTORY and PROFILE to personalize the response.

3. If wellness context is available:
   - Clearly separate it under:
     "Traditional Wellness Suggestion"
   - Never allow wellness advice to override clinical guidance.

4. If symptoms appear dangerous
   (e.g. chest pain, breathing difficulty, stroke symptoms,
   suicidal thoughts, severe bleeding),
   strongly recommend emergency medical attention.

5. Keep the response:
   - safe
   - medically responsible
   - easy to understand
   - conversational and empathetic

6. Do NOT provide absolute diagnoses.

7. Respond STRICTLY in:
{language}

====================================================
OUTPUT FORMAT
====================================================

Return ONLY valid JSON.

Analyze the user's query and provide a safe response.
If the user explicitly asks for nearby hospitals/clinics, OR if their symptoms indicate a HIGH RISK medical emergency (e.g., chest pain, severe bleeding), you MUST set "needs_map" to true.

Format your output as valid JSON with these exact keys:
{{
  "answer": "Your medical response here",
  "risk_level": "LOW | MEDIUM | HIGH",
  "explainability": "Why this advice was given and what sources/context were used",
  "needs_map": true
}}


====================================================
USER QUERY
====================================================

{query}
"""

    return system_prompt