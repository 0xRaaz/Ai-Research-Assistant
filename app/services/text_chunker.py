from langchain_text_splitters import RecursiveCharacterTextSplitter
import os

def load_processed_text(filename: str) -> str:
    """Load cleaned text from data/processed/ folder."""

    base_name = os.path.splitext(filename)[0]  # remove .pdf
    file_path = os.path.join("data/processed", f"{base_name}.txt")

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Processed file not found: {file_path}")

    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()


def split_text_into_chunks(text: str, chunk_size: int = 500, chunk_overlap: int = 50) -> list[str]:
    """Split text into overlapping chunks using LangChain splitter."""

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ".", " ", ""]
    )

    chunks = splitter.split_text(text)
    return chunks


def chunk_document(filename: str) -> dict:
    """Full pipeline: load text → split into chunks."""

    text = load_processed_text(filename)
    chunks = split_text_into_chunks(text)

    return {
        "filename": filename,
        "total_chunks": len(chunks),
        "chunk_size": 500,
        "chunk_overlap": 50,
        "chunks": chunks
    }