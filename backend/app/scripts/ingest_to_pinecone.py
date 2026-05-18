import pandas as pd
import argparse
import uuid
import os
from tqdm import tqdm
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("PINECONE_INDEX_NAME", "medical-rag"))

print("Loading Embedding Model...")
model = SentenceTransformer('all-MiniLM-L6-v2')

# --- CHECKPOINT LOGIC ---
def get_checkpoint_path(input_path):
    return f"{input_path}.checkpoint"

def read_checkpoint(input_path):
    """Reads the last completed chunk index from the checkpoint file."""
    chk_path = get_checkpoint_path(input_path)
    if os.path.exists(chk_path):
        with open(chk_path, 'r') as f:
            return int(f.read().strip())
    return 0

def write_checkpoint(input_path, chunk_idx):
    """Saves the completed chunk index to a file."""
    chk_path = get_checkpoint_path(input_path)
    with open(chk_path, 'w') as f:
        f.write(str(chunk_idx))
# ------------------------

def ingest_to_pinecone(input_path):
    print(f"\n🧠 Starting Pinecone Ingestion for: {input_path}")
    
    chunk_size = 5000
    batch_upsert_size = 100
    total_upserted = 0

    # 1. Check if we are resuming from a previous crash/stop
    start_chunk = read_checkpoint(input_path)
    if start_chunk > 0:
        print(f"🔄 Resuming from Chunk {start_chunk + 1}... (Skipping already processed rows)")

    for chunk_idx, chunk in enumerate(pd.read_csv(input_path, chunksize=chunk_size)):
        
        # 2. Skip chunks that were already successfully uploaded
        if chunk_idx < start_chunk:
            continue

        if chunk.empty: continue
        
        chunk = chunk.drop_duplicates(subset=['text'])
        chunk = chunk.reset_index(drop=True) 
        texts = chunk['text'].tolist()
        
        target_namespace = chunk['namespace'].iloc[0] 
        embeddings = model.encode(texts).tolist()
        
        vectors = []
        for i, row in chunk.iterrows():
            doc_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, row['text']))
            meta = {
                "layer": row['layer'],
                "category": row['category'],
                "source": row['source'],
                "text": row['text']
            }
            vectors.append((doc_id, embeddings[i], meta))
            
        # 3. Network Error Handling
        try:
            for i in tqdm(range(0, len(vectors), batch_upsert_size), desc=f"Chunk {chunk_idx+1} -> {target_namespace}"):
                index.upsert(vectors=vectors[i : i + batch_upsert_size], namespace=target_namespace)
        except Exception as e:
            print(f"\n❌ Network error or interruption! Script stopped safely.")
            print(f"Details: {e}")
            print(f"Just run the same command again to resume from Chunk {chunk_idx + 1}!")
            return # Exit the script safely without saving this chunk as "completed"
            
        total_upserted += len(vectors)
        
        # 4. Save checkpoint ONLY when the chunk is 100% uploaded
        write_checkpoint(input_path, chunk_idx + 1)
        
    print(f"✅ Ingestion Complete. {total_upserted} vectors added to namespace: '{target_namespace}'.")
    
    # 5. Clean up the checkpoint file when completely done
    chk_path = get_checkpoint_path(input_path)
    if os.path.exists(chk_path):
        os.remove(chk_path)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Path to processed CSV")
    args = parser.parse_args()
    ingest_to_pinecone(args.input)