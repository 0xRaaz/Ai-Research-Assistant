import chromadb
import os

# Path where ChromaDB will store its data
CHROMA_PATH = "data/vector_db"
os.makedirs(CHROMA_PATH, exist_ok=True)

# Initialize ChromaDB client (persistent storage)
client = chromadb.PersistentClient(path=CHROMA_PATH)


def get_or_create_collection(collection_name: str):
    """Get existing collection or create a new one."""
    import re
    sanitized_name = re.sub(r'[^a-zA-Z0-9_-]', '_', collection_name).strip('_')
    if len(sanitized_name) < 3:
        sanitized_name = sanitized_name.ljust(3, '_')

    collection = client.get_or_create_collection(
        name=sanitized_name,
        metadata={"hnsw:space": "cosine"}  # use cosine similarity
    )
    return collection


def store_embeddings(collection_name: str, chunks: list[str], embeddings: list[list[float]], filename: str):
    """Store text chunks and their embeddings into ChromaDB."""

    collection = get_or_create_collection(collection_name)

    # Create unique IDs for each chunk
    ids = [f"{filename}_chunk_{i}" for i in range(len(chunks))]

    # Store in ChromaDB
    collection.add(
        ids=ids,
        documents=chunks,
        embeddings=embeddings,
        metadatas=[{"filename": filename, "chunk_index": i} for i in range(len(chunks))]
    )

    return {
        "collection": collection_name,
        "stored_chunks": len(chunks),
        "filename": filename
    }


def retrieve_similar_chunks(collection_name: str, query_embedding: list[float], top_k: int = 5) -> list[dict]:
    """Retrieve top-k most similar chunks with scores and metadata."""

    collection = get_or_create_collection(collection_name)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        include=["documents", "distances", "metadatas"]
    )

    # Package chunks with their relevance score and metadata
    chunks = []
    documents = results["documents"][0]
    distances = results["distances"][0]
    metadatas = results["metadatas"][0]

    for doc, distance, meta in zip(documents, distances, metadatas):
        # Convert cosine distance to similarity score (0-1, higher = more similar)
        similarity_score = round(1 - distance, 4)
        chunks.append({
            "text": doc,
            "score": similarity_score,
            "chunk_index": meta.get("chunk_index", -1),
            "filename": meta.get("filename", "")
        })

    return chunks


def get_collection_info(collection_name: str) -> dict:
    """Get basic info about a collection."""

    collection = get_or_create_collection(collection_name)
    return {
        "collection_name": collection_name,
        "total_stored": collection.count()
    }