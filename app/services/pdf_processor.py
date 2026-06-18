import os
from pypdf import PdfReader

PROCESSED_DIR = "data/processed"
os.makedirs(PROCESSED_DIR, exist_ok=True)


def extract_text_from_pdf(file_path: str) -> str:
    """Extract raw text from a PDF file."""

    reader = PdfReader(file_path)
    full_text = ""

    for page in reader.pages:
        text = page.extract_text()
        if text:
            full_text += text + "\n"

    return full_text


def clean_text(text: str) -> str:
    """Clean extracted text — remove extra spaces and blank lines."""

    lines = text.splitlines()
    cleaned_lines = [line.strip() for line in lines if line.strip()]
    return "\n".join(cleaned_lines)


def save_processed_text(filename: str, text: str) -> str:
    """Save cleaned text to data/processed/ folder."""

    base_name = os.path.splitext(filename)[0]  # remove .pdf
    save_path = os.path.join(PROCESSED_DIR, f"{base_name}.txt")

    with open(save_path, "w", encoding="utf-8") as f:
        f.write(text)

    return save_path


def process_pdf(file_path: str, filename: str) -> dict:
    """Full pipeline: extract → clean → save."""

    raw_text = extract_text_from_pdf(file_path)
    cleaned = clean_text(raw_text)
    saved_at = save_processed_text(filename, cleaned)

    return {
        "filename": filename,
        "characters": len(cleaned),
        "saved_at": saved_at,
        "preview": cleaned[:300]  # first 300 characters as preview
    }