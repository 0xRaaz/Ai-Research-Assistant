import pytest


def test_short_summary(client, uploaded_filename):
    """Test generating a short summary."""
    response = client.post(
        "/api/summary",
        json={
            "filename": uploaded_filename,
            "summary_type": "short"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert len(data["summary"]) > 0
    assert data["summary_type"] == "short"


def test_detailed_summary(client, uploaded_filename):
    """Test generating a detailed summary."""
    import time
    time.sleep(5)  # avoid Gemini rate limit after short summary test

    response = client.post(
        "/api/summary",
        json={
            "filename": uploaded_filename,
            "summary_type": "detailed"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert len(data["summary"]) > 0


def test_sectionwise_summary(client, uploaded_filename):
    """Test generating a section-wise summary."""
    import time
    time.sleep(30)  # 👈 wait before firing 5 LLM calls

    response = client.post(
        "/api/summary",
        json={
            "filename": uploaded_filename,
            "summary_type": "sectionwise"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    summary = data["summary"]
    assert isinstance(summary, dict)
    assert "abstract" in summary or "introduction" in summary


def test_invalid_summary_type(client, uploaded_filename):
    """Test that invalid summary type returns 400."""
    response = client.post(
        "/api/summary",
        json={
            "filename": uploaded_filename,
            "summary_type": "invalid_type"
        }
    )
    assert response.status_code == 400


def test_summary_empty_filename(client):
    """Test that empty filename returns 400."""
    response = client.post(
        "/api/summary",
        json={
            "filename": "",
            "summary_type": "short"
        }
    )
    assert response.status_code == 400


def test_summary_missing_fields(client):
    """Test that missing fields return 422."""
    response = client.post("/api/summary", json={})
    assert response.status_code == 422

