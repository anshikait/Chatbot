# from pinecone import Pinecone
# from dotenv import load_dotenv
# import os

# # Load environment variables
# load_dotenv()

# # Get values from .env
# api_key = os.getenv("PINECONE_API_KEY")
# index_name = os.getenv("PINECONE_INDEX_NAME")

# # Initialize Pinecone
# pc = Pinecone(api_key=api_key)

# # Connect to index
# index = pc.Index(index_name)

# # Get statistics
# stats = index.describe_index_stats()

# # Print full stats
# print("\nFull Stats:")
# print(stats)

# # Print total embeddings
# print("\nTotal Embeddings:")
# print(stats["total_vector_count"])

# # Print namespace-wise embeddings
# print("\nNamespaces:")
# for namespace, data in stats["namespaces"].items():
#     print(f"{namespace}: {data['vector_count']} vectors")


from pinecone import Pinecone
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Initialize Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

# Connect to index
index = pc.Index(os.getenv("PINECONE_INDEX_NAME", "medical-rag"))

# Get stats
stats = index.describe_index_stats()

print("\n📊 Pinecone Embedding Statistics:\n")

for namespace, data in stats["namespaces"].items():
    vector_count = data["vector_count"]

    print(
        f"✅ Namespace '{namespace}' has {vector_count} embeddings "
        f"generated from processed text chunks."
    )