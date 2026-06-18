# app/api/papers.py
from fastapi import APIRouter, Depends, HTTPException
from app.api.auth import get_current_user
import os
import shutil

router = APIRouter()

UPLOAD_DIR = "data/uploads"
PROCESSED_DIR = "data/processed"


# ── GET /api/papers ── list all uploaded papers
@router.get("/papers")
def get_papers(current_user=Depends(get_current_user)):
    papers = []

    if not os.path.exists(UPLOAD_DIR):
        return {"papers": []}

    for filename in os.listdir(UPLOAD_DIR):
        if not filename.endswith(".pdf"):
            continue

        filepath = os.path.join(UPLOAD_DIR, filename)
        base     = os.path.splitext(filename)[0]
        processed_path = os.path.join(PROCESSED_DIR, f"{base}.txt")

        chunk_count = 0
        if os.path.exists(processed_path):
            with open(processed_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
                chunk_count = max(1, len(text) // 1000)

        stat = os.stat(filepath)

        papers.append({
            "id":          base,           # collection_name used in ChromaDB
            "filename":    filename,
            "displayName": base.replace("_", " ").replace("-", " "),
            "chunkCount":  chunk_count,
            "uploadedAt":  __import__('datetime').datetime.fromtimestamp(
                               stat.st_mtime).isoformat(),
        })

    # Newest first
    papers.sort(key=lambda x: x["uploadedAt"], reverse=True)
    return {"papers": papers}

@router.patch("/papers/{paper_id}")
def rename_paper(
    paper_id: str,
    body: dict,
    current_user=Depends(get_current_user)
):
    # Just return ok — display name is frontend-only for now
    return {"ok": True, "displayName": body.get("displayName", paper_id)}


@router.delete("/papers/{paper_id}")
def delete_paper(
    paper_id: str,
    current_user=Depends(get_current_user)
):
    UPLOAD_DIR    = "data/uploads"
    PROCESSED_DIR = "data/processed"
    CHROMA_DIR    = "data/vector_db"

    # Delete PDF file
    pdf_path = os.path.join(UPLOAD_DIR, f"{paper_id}.pdf")
    if os.path.exists(pdf_path):
        os.remove(pdf_path)

    # Delete processed text
    txt_path = os.path.join(PROCESSED_DIR, f"{paper_id}.txt")
    if os.path.exists(txt_path):
        os.remove(txt_path)

    # Delete ChromaDB collection
    try:
        import chromadb
        client = chromadb.PersistentClient(path=CHROMA_DIR)
        client.delete_collection(f"{paper_id}")
    except Exception:
        pass

    return {"ok": True}