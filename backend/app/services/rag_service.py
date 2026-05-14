# app/services/rag_service.py
from app.services.pinecone_service import search_embeddings
from app.services.mongo_service import profiles_collection

def detect_wellness_intent(query: str) -> bool:
    """Detects if user explicitly wants natural or traditional remedies."""
    wellness_keywords =["ayurved", "home remedy", "natural", "herbal", "tulsi", "yoga", "traditional", "homeopathic"]
    # Check if any keyword is in the user's query
    return any(word in query.lower() for word in wellness_keywords)


def build_rag_prompt(user_id: str, query: str, language: str) -> str:
    # 1. Detect Intent (Clinical vs Wellness)
    is_wellness = detect_wellness_intent(query)
    target_layer = "wellness" if is_wellness else "clinical"

    # 2. Retrieve Context (Pass the target_layer to Pinecone)
    contexts = search_embeddings(query, user_id=user_id, top_k=4, layer=target_layer)
    context_text = "\n".join(contexts)

    # 3. Retrieve Profile
    profile = profiles_collection.find_one({"user_id": user_id}, {"_id": 0, "user_id": 0})
    profile_text = str(profile) if profile else "No profile data available."

    # 4. Set the AI Persona based on the target layer
    if target_layer == "wellness":
        role_instruction = """You are a wellness advisor. Base your answer ONLY on the provided ayurvedic/home remedy context. 
MANDATORY: Add a disclaimer in your explainability that this is traditional wellness advice and not a medical prescription."""
    else:
        role_instruction = """You are a clinical AI doctor. Base your diagnosis strictly on the provided medical context. 
MANDATORY: Provide an evidence-based clinical response and note the risk level accurately."""

    # 5. Build the final prompt (Keeping your existing JSON structure intact!)
    system_prompt = f"""{role_instruction}
    
User Profile: {profile_text}
Relevant Medical/History Context: {context_text}

Analyze the user's query and provide a safe response.
Respond strictly in {language}.
Format your output as valid JSON with three keys:
"response": "Your detailed answer",
"risk_level": "LOW, MEDIUM, or HIGH based on triage logic",
"explainability": "Summary of why this suggestion was given and sources"
"""
    return system_prompt