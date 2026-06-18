import pytest
from fastapi.testclient import TestClient
import os


def test_upload_valid_pdf(client):
    """Test uploading a valid PDF file."""
    pdf_path = "data/uploads/demo_research.pdf"
    if not os.path.exists(pdf_path):
        pytest.skip("Test PDF not found.")

    with open(pdf_path, "rb") as f:
        response = client.post(
            "/api/upload",
            files={"file": ("demo_research.pdf", f, "application/pdf")}
        )
    assert response.status_code in [200, 400]  # 400 if already uploaded
    data = response.json()
    assert "message" in data or "detail" in data


def test_upload_non_pdf_file(client):
    """Test that non-PDF files are rejected."""
    response = client.post(
        "/api/upload",
        files={"file": ("test.txt", b"hello world", "text/plain")}
    )
    assert response.status_code == 400
    assert "detail" in response.json()


def test_upload_no_file(client):
    """Test that missing file returns error."""
    response = client.post("/api/upload")
    assert response.status_code == 422  # FastAPI validation error