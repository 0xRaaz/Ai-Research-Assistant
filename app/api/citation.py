from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.citation_extractor import (
    extract_citations,
    extract_paper_metadata
)
from app.api.auth import get_current_user

router = APIRouter()


class CitationRequest(BaseModel):
    filename: str
    extract_type: str = "citations"


@router.post("/citation")
async def extract_citation_info(
    request: CitationRequest,
    current_user=Depends(get_current_user)
):
    if not request.filename.strip():
        raise HTTPException(status_code=400, detail="Filename cannot be empty.")

    valid_types = ["citations", "metadata"]
    if request.extract_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid extract type. Choose from: {valid_types}"
        )

    try:
        if request.extract_type == "citations":
            result = extract_citations(request.filename)
            return {
                "message": "Citations extracted successfully ✅",
                "requested_by": current_user.name,
                "filename": request.filename,
                "total_citations": result.get("total_citations", 0),
                "citations": result.get("citations", [])
            }

        elif request.extract_type == "metadata":
            result = extract_paper_metadata(request.filename)
            return {
                "message": "Paper metadata extracted successfully ✅",
                "requested_by": current_user.name,
                "filename": request.filename,
                "title": result.get("title"),
                "authors": result.get("authors"),
                "year": result.get("year"),
                "abstract": result.get("abstract"),
                "keywords": result.get("keywords")
            }

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))