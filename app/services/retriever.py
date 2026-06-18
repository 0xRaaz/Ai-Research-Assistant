from app.database.vector_store import retrieve_similar_chunks
from app.services.embedding_service import get_embedding_for_query


def retrieve_relevant_chunks(query: str, collection_name: str, top_k: int = 5) -> list[dict]:
    """Convert query to embedding and retrieve similar chunks from ChromaDB."""

    query_embedding = get_embedding_for_query(query)

    chunks = retrieve_similar_chunks(
        collection_name=collection_name,
        query_embedding=query_embedding,
        top_k=top_k
    )

    return chunks


def format_context(chunks: list[dict]) -> str:
    """Join retrieved chunks into a single context string for the LLM."""

    # Handle both old (list of strings) and new (list of dicts) format
    texts = []
    for chunk in chunks:
        if isinstance(chunk, dict):
            texts.append(chunk["text"])
        else:
            texts.append(chunk)

    return "\n\n---\n\n".join(texts)