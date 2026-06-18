from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from app.services.retriever import retrieve_relevant_chunks, format_context
from dotenv import load_dotenv
import os

load_dotenv()

# Initialize Gemini LLM
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=os.getenv("GEMINI_API_KEY"),
    temperature=0.3
)


def answer_question(query: str, collection_name: str) -> dict:
    """Full RAG pipeline: retrieve context → send to LLM → return answer."""

    # Step 1 — Retrieve relevant chunks
    chunks = retrieve_relevant_chunks(query, collection_name, top_k=5)

    if not chunks:
        return {
            "question": query,
            "answer": "No relevant content found in the document.",
            "chunks_used": 0
        }

    # Step 2 — Format context
    context = format_context(chunks)

    # Step 3 — Build prompt
    system_prompt = """You are an AI Research Assistant.
You answer questions strictly based on the provided research paper context.
If the answer is not in the context, say: 'This information is not available in the document.'
Be concise, accurate, and helpful."""

    user_prompt = f"""Context from the research paper:
{context}

Question: {query}

Answer:"""

    # Step 4 — Send to Gemini LLM
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ]

    response = llm.invoke(messages)

    return {
        "question": query,
        "answer": response.content,
        "chunks_used": len(chunks),
        "context_preview": context[:300]
    }