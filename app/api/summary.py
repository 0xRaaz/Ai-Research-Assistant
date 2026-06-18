from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.summarizer import (
    generate_short_summary,
    generate_detailed_summary,
    generate_sectionwise_summary
)
from app.api.auth import get_current_user

router = APIRouter()


class SummaryRequest(BaseModel):
    filename: str
    summary_type: str


@router.post("/summary")
async def summarize_pdf(
    request: SummaryRequest,
    current_user=Depends(get_current_user)
):
    if not request.filename.strip():
        raise HTTPException(status_code=400, detail="Filename cannot be empty.")

    valid_types = ["short", "detailed", "sectionwise"]
    if request.summary_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid summary type. Choose from: {valid_types}"
        )

    try:
        if request.summary_type == "short":
            summary = generate_short_summary(request.filename)
            return {
                "message": "Short summary generated ✅",
                "requested_by": current_user.name,
                "filename": request.filename,
                "summary_type": "short",
                "summary": summary
            }

        elif request.summary_type == "detailed":
            summary = generate_detailed_summary(request.filename)
            return {
                "message": "Detailed summary generated ✅",
                "requested_by": current_user.name,
                "filename": request.filename,
                "summary_type": "detailed",
                "summary": summary
            }

        elif request.summary_type == "sectionwise":
            summary = generate_sectionwise_summary(request.filename)
            return {
                "message": "Section-wise summary generated ✅",
                "requested_by": current_user.name,
                "filename": request.filename,
                "summary_type": "sectionwise",
                "summary": summary
            }

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))