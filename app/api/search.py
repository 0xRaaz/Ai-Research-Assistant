from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.retriever import retrieve_relevant_chunks
from app.api.auth import get_current_user
import os

router = APIRouter()


class SearchRequest(BaseModel):
    filename: str
    query: str
    top_k: int = 5


@router.post("/search")
async def semantic_search(
    request: SearchRequest,
    current_user=Depends(get_current_user)
):
    if not request.filename.strip():
        raise HTTPException(status_code=400, detail="Filename cannot be empty.")

    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    if request.top_k < 1 or request.top_k > 20:
        raise HTTPException(status_code=400, detail="top_k must be between 1 and 20.")

    try:
        collection_name = os.path.splitext(request.filename)[0]

        chunks = retrieve_relevant_chunks(
            query=request.query,
            collection_name=collection_name,
            top_k=request.top_k
        )

        # Append rank and relevance_score to search results
        results = []
        for i, chunk in enumerate(chunks):
            chunk_copy = dict(chunk)
            chunk_copy["rank"] = i + 1
            chunk_copy["relevance_score"] = chunk_copy.get("score", 0.0)
            results.append(chunk_copy)

        return {
            "message": "Search completed successfully ✅",
            "searched_by": current_user.name,
            "filename": request.filename,
            "query": request.query,
            "total_results": len(results),
            "results": results
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))