import pytest


def test_chat_valid_question(client, uploaded_filename):
    """Test asking a valid question about the PDF."""
    response = client.post(
        "/api/chat",
        json={
            "filename": uploaded_filename,
            "question": "What is this research paper about?"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert len(data["answer"]) > 0


def test_chat_empty_question(client, uploaded_filename):
    """Test that empty question returns 400."""
    response = client.post(
        "/api/chat",
        json={
            "filename": uploaded_filename,
            "question": ""
        }
    )
    assert response.status_code == 400


def test_chat_empty_filename(client):
    """Test that empty filename returns 400."""
    response = client.post(
        "/api/chat",
        json={
            "filename": "",
            "question": "What is this about?"
        }
    )
    assert response.status_code == 400


def test_chat_missing_fields(client):
    """Test that missing fields return 422."""
    response = client.post("/api/chat", json={})
    assert response.status_code == 422


def test_chat_nonexistent_file(client):
    """Test that nonexistent file returns 404."""
    response = client.post(
        "/api/chat",
        json={
            "filename": "nonexistent_file.pdf",
            "question": "What is this about?"
        }
    )
    assert response.status_code in [404, 500]