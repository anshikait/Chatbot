import pandas as pd
import argparse
import uuid
import os
from tqdm import tqdm
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from utils import load_config
from dotenv import load_dotenv

load_dotenv()

# Initialize Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("PINECONE_INDEX_NAME", "medical-rag"))

# Initialize fast local embedding model
print("Loading Embedding Model...")
model = SentenceTransformer('all-MiniLM-L6-v2')

def ingest_to_pinecone(dataset_key, input_path):
    config = load_config()['datasets'].get(dataset_key)
    if not config:
        raise ValueError(f"Dataset {dataset_key} not found in config.yaml")

    # Metadata template to attach to every vector
    base_metadata = {
        "layer": config["layer"],
        "category": config["category"],
        "source": config["source"],
        "priority": config["priority"],
        "user_id": "general" # System-wide knowledge
    }

    print(f"\n🧠 Starting Pinecone Ingestion for [{dataset_key.upper()}] -> Layer: {config['layer'].upper()}")
    
    chunk_size = 5000
    batch_upsert_size = 100
    total_upserted = 0

    for chunk_idx, chunk in enumerate(pd.read_csv(input_path, chunksize=chunk_size)):
        texts = chunk['semantic_text'].dropna().tolist()
        if not texts: continue
        
        # Prevent duplicate semantic rows by hashing the text (Bonus Feature)
        unique_texts = list(set(texts)) 
        
        # Generate embeddings
        embeddings = model.encode(unique_texts).tolist()
        
        vectors =[]
        for i, text in enumerate(unique_texts):
            doc_id = f"{dataset_key}_{uuid.uuid5(uuid.NAMESPACE_DNS, text)}" # Deterministic ID prevents duplication
            meta = base_metadata.copy()
            meta["text"] = text # Store original text for RAG retrieval
            vectors.append((doc_id, embeddings[i], meta))
            
        # Batch Upsert to Pinecone
        for i in tqdm(range(0, len(vectors), batch_upsert_size), desc=f"Upserting chunk {chunk_idx+1}"):
            index.upsert(vectors=vectors[i : i + batch_upsert_size])
            
        total_upserted += len(vectors)
        
    print(f"✅ Ingestion Complete. {total_upserted} vectors added to the '{config['layer']}' layer.\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True, help="Dataset key from config.yaml (e.g., symptoms, ayurveda)")
    parser.add_argument("--input", required=True, help="Path to processed CSV")
    args = parser.parse_args()
    
    ingest_to_pinecone(args.dataset, args.input)