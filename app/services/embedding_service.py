import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini API
genai.configure(
    api_key=os.getenv("GEMINI_API_KEY")
)


def generate_embeddings(chunks: list[str]) -> list[list[float]]:
    """
    Convert multiple text chunks into vector embeddings using Gemini.
    """

    print(f"Generating embeddings for {len(chunks)} chunks...")

    embeddings = []

    for chunk in chunks:
        response = genai.embed_content(
            model="models/text-embedding-004",
            content=chunk,
            task_type="retrieval_document"
        )

        embeddings.append(response["embedding"])

    return embeddings



def get_embedding_for_query(query: str) -> list[float]:
    """
    Convert a user query into an embedding vector.
    """

    response = genai.embed_content(
        model="models/text-embedding-004",
        content=query,
        task_type="retrieval_query"
    )

    return response["embedding"]
