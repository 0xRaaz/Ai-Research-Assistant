import pytest


def test_semantic_search_valid(client, uploaded_filename):
    """Test valid semantic search query."""
    response = client.post(
        "/api/search",
        json={
            "filename": uploaded_filename,
            "query": "what methodology was used?",
            "top_k": 3
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) <= 3
    assert data["total_results"] > 0


def test_search_result_structure(client, uploaded_filename):
    """Test that search results have correct structure."""
    response = client.post(
        "/api/search",
        json={
            "filename": uploaded_filename,
            "query": "research objectives",
            "top_k": 2
        }
    )
    assert response.status_code == 200
    results = response.json()["results"]
    for result in results:
        assert "rank" in result
        assert "text" in result
        assert "relevance_score" in result
        assert "chunk_index" in result
        assert 0.0 <= result["relevance_score"] <= 1.0


def test_search_default_top_k(client, uploaded_filename):
    """Test search with default top_k (5)."""
    response = client.post(
        "/api/search",
        json={
            "filename": uploaded_filename,
            "query": "AI research"
        }
    )
    assert response.status_code == 200
    assert len(response.json()["results"]) <= 5


def test_search_empty_query(client, uploaded_filename):
    """Test that empty query returns 400."""
    response = client.post(
        "/api/search",
        json={
            "filename": uploaded_filename,
            "query": ""
        }
    )
    assert response.status_code == 400


def test_search_invalid_top_k(client, uploaded_filename):
    """Test that invalid top_k returns 400."""
    response = client.post(
        "/api/search",
        json={
            "filename": uploaded_filename,
            "query": "research",
            "top_k": 50  # exceeds max of 20
        }
    )
    assert response.status_code == 400


def test_search_empty_filename(client):
    """Test that empty filename returns 400."""
    response = client.post(
        "/api/search",
        json={
            "filename": "",
            "query": "research"
        }
    )
    assert response.status_code == 400