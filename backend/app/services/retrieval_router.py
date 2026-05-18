import os
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("PINECONE_INDEX_NAME", "medical-rag"))
model = SentenceTransformer('all-MiniLM-L6-v2')

def get_routing_namespaces(query: str):
    """Analyzes intent to route vector search to correct namespaces."""
    wellness_keywords = ["home remedy", "ayurved", "natural", "herbal", "traditional", "tulsi"]
    
    if any(word in query.lower() for word in wellness_keywords):
        return ["wellness"] # ONLY search wellness layer
    
    # Default Evidence-based search
    return ["clinical", "conversation", "medicalqa"]

def retrieve_layered_context(query: str, user_id: str, top_k=3):
    """Queries intelligent namespaces and combines memory."""
    query_embedding = model.encode(query).tolist()
    namespaces = get_routing_namespaces(query)
    
    # Always query the user's specific history
    namespaces.extend(["memory", "reports"])
    
    combined_contexts = {
        "clinical_evidence": [],
        "wellness_advice": [],
        "user_history": []
    }
    
    for ns in namespaces:
        try:
            # Metadata filter: Enforce user security on memory/reports
            search_filter = {"user_id": user_id} if ns in ["memory", "reports"] else None
            
            results = index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True,
                namespace=ns,
                filter=search_filter
            )
            
            for match in results["matches"]:
                text = match["metadata"]["text"]
                if ns in ["clinical", "conversation", "medicalqa"]:
                    combined_contexts["clinical_evidence"].append(text)
                elif ns == "wellness":
                    combined_contexts["wellness_advice"].append(text)
                elif ns in ["memory", "reports"]:
                    combined_contexts["user_history"].append(text)
                    
        except Exception:
            pass # Namespace might be empty, skip safely

    return combined_contexts