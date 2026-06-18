import pytest
import time
from fastapi.testclient import TestClient
from app.main import app
import os

from app.api.auth import get_current_user

class MockUser:
    id = 1
    name = "Test User"
    email = "test@example.com"
    created_at = None

app.dependency_overrides[get_current_user] = lambda: MockUser()

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="session")
def uploaded_filename():
    return "demo_research.pdf"

@pytest.fixture(scope="session", autouse=True)
def ensure_test_pdf_uploaded(client, uploaded_filename):
    pdf_path = f"data/uploads/{uploaded_filename}"
    if not os.path.exists(pdf_path):
        pytest.skip(f"Test PDF not found at {pdf_path}.")
    with open(pdf_path, "rb") as f:
        response = client.post(
            "/api/upload",
            files={"file": (uploaded_filename, f, "application/pdf")}
        )
    assert response.status_code in [200, 400]

@pytest.fixture(autouse=True)
def rate_limit_delay():
    """Add delay before every test to avoid Gemini rate limits."""
    time.sleep(10)  # 10 seconds between every test
    yield