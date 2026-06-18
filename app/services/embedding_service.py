from sentence_transformers import SentenceTransformer

# Load the embedding model once (reused across all calls)
MODEL_NAME = "all-MiniLM-L6-v2"
model = SentenceTransformer(MODEL_NAME)


def generate_embeddings(chunks: list[str]) -> list[list[float]]:
    """Convert text chunks into vector embeddings."""

    print(f"Generating embeddings for {len(chunks)} chunks...")
    embeddings = model.encode(chunks, show_progress_bar=True)

    return embeddings.tolist()  # convert numpy array to plain list


def get_embedding_for_query(query: str) -> list[float]:
    """Convert a single query string into an embedding vector."""

    embedding = model.encode([query])
    return embedding[0].tolist()