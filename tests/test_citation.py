import pytest


def test_citation_extraction_valid(client, uploaded_filename):
    """Test valid citation extraction."""
    response = client.post(
        "/api/citation",
        json={"filename": uploaded_filename}
    )
    assert response.status_code == 200
    data = response.json()
    assert "citations" in data
    assert "total_found" in data
    assert isinstance(data["citations"], list)


def test_citation_result_structure(client, uploaded_filename):
    """Test that citation results have correct structure."""
    response = client.post(
        "/api/citation",
        json={"filename": uploaded_filename}
    )
    assert response.status_code == 200
    citations = response.json()["citations"]
    for citation in citations:
        assert "title" in citation
        assert "authors" in citation
        assert "year" in citation


def test_citation_empty_filename(client):
    """Test that empty filename returns 400."""
    response = client.post(
        "/api/citation",
        json={"filename": ""}
    )
    assert response.status_code == 400


def test_citation_nonexistent_file(client):
    """Test that nonexistent file returns 404."""
    response = client.post(
        "/api/citation",
        json={"filename": "nonexistent.pdf"}
    )
    assert response.status_code == 404


def test_citation_missing_fields(client):
    """Test that missing fields return 422."""
    response = client.post("/api/citation", json={})
    assert response.status_code == 422