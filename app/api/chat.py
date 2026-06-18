from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.rag_pipeline import answer_question
from app.api.auth import get_current_user
import os

router = APIRouter()


class ChatRequest(BaseModel):
    filename: str
    question: str


@router.post("/chat")
async def chat_with_pdf(
    request: ChatRequest,
    current_user=Depends(get_current_user)
):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if not request.filename.strip():
        raise HTTPException(status_code=400, detail="Filename cannot be empty.")

    base_name = os.path.splitext(request.filename)[0]
    processed_path = os.path.join("data/processed", f"{base_name}.txt")
    if not os.path.exists(processed_path):
        raise HTTPException(status_code=404, detail="Document not found.")

    collection_name = base_name

    result = answer_question(
        query=request.question,
        collection_name=collection_name
    )

    return {
        "message": "Answer generated successfully ✅",
        "asked_by": current_user.name,
        "filename": request.filename,
        "question": result["question"],
        "answer": result["answer"],
        "chunks_used": result["chunks_used"]
    }