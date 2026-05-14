from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from app.config import settings
import uuid

# Initialize Pinecone and local Embedding Model
pc = Pinecone(api_key=settings.PINECONE_API_KEY)
index = pc.Index(settings.PINECONE_INDEX_NAME)

# Using local open-source sentence transformer for embeddings (Dim: 384)
model = SentenceTransformer('all-MiniLM-L6-v2') 

def get_embedding(text: str) -> list:
    return model.encode(text).tolist()

def upsert_embedding(user_id: str, doc_type: str, text: str, extra_metadata: dict = None):
    embedding = get_embedding(text)
    metadata = {
        "user_id": user_id,
        "type": doc_type,
        "original_text": text
    }
    if extra_metadata:
        metadata.update(extra_metadata)
    
    doc_id = str(uuid.uuid4())
    index.upsert(vectors=[(doc_id, embedding, metadata)])

def search_embeddings(query: str, user_id: str = None, top_k: int = 5, layer: str = "clinical"):
    query_embedding = get_embedding(query)
    
    # 🎯 Let Pinecone do the filtering server-side
    search_filter = {
        "$or":[
            {"layer": layer},             # 1. Pull from requested layer (Clinical or Wellness)
            {"user_id": "general"},       # 2. Pull from old "general" datasets you uploaded previously
            {"user_id": user_id}          # 3. Pull from User's personal history/reports
        ]
    }

    # Query Pinecone WITH the filter applied
    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True,
        filter=search_filter
    )
    
    contexts = []
    for match in results["matches"]:
        metadata = match["metadata"]
        
        # Get the text. We use .get("text") for new datasets and .get("original_text") for old ones.
        text_content = metadata.get("text") or metadata.get("original_text", "")
        
        if text_content:
            contexts.append(text_content)
            
    return contexts