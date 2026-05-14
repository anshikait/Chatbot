from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key="YOUR_PINECONE_API_KEY")

pc.create_index(
    name="medical-rag",
    dimension=384,
    metric="cosine",
    spec=ServerlessSpec(
        cloud="aws",
        region="us-east-1"
    )
)

print("Index created successfully")