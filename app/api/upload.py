from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.services.pdf_processor import process_pdf
from app.services.text_chunker import chunk_document
from app.services.embedding_service import generate_embeddings
from app.database.vector_store import store_embeddings
from app.api.auth import get_current_user
import shutil
import os

router = APIRouter()

UPLOAD_DIR = "data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    result = process_pdf(file_path, file.filename)
    chunk_result = chunk_document(file.filename)
    embeddings = generate_embeddings(chunk_result["chunks"])

    collection_name = os.path.splitext(file.filename)[0]
    store_result = store_embeddings(
        collection_name=collection_name,
        chunks=chunk_result["chunks"],
        embeddings=embeddings,
        filename=file.filename
    )

    return {
        "message": "PDF uploaded, processed, chunked, embedded and stored successfully ✅",
        "uploaded_by": current_user.name,
        "filename": result["filename"],
        "characters_extracted": result["characters"],
        "total_chunks": chunk_result["total_chunks"],
        "embeddings_generated": len(embeddings),
        "embedding_dimensions": len(embeddings[0]),
        "collection": store_result["collection"],
        "stored_in_chromadb": store_result["stored_chunks"],
        "preview": result["preview"]
    }