import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["isro_problem_statement"] == "26167"


def test_models_endpoint():
    response = client.get("/api/v1/models")
    assert response.status_code == 200
    models = response.json()
    assert len(models) >= 5
    capabilities = [m["capability"] for m in models]
    assert "single_image_vqa" in capabilities
    assert "bi_temporal_change_detection" in capabilities
    assert "cross_modal_analysis" in capabilities


def test_evaluation_endpoint():
    response = client.get("/api/v1/evaluation")
    assert response.status_code == 200
    evals = response.json()
    assert len(evals) >= 4
    datasets = [e["dataset"] for e in evals]
    assert any("RSVQA" in d for d in datasets)


def test_samples_endpoint():
    response = client.get("/api/v1/samples")
    assert response.status_code == 200
    samples = response.json()
    assert len(samples) >= 4


def test_end_to_end_vqa_analysis():
    # Execute analysis using pre-bundled sample
    response = client.post("/api/v1/analyze", json={
        "query": "What type of land cover dominates this region?",
        "image_ids": ["sample_vqa_optical.png"],
        "use_adapted_model": False
    })
    assert response.status_code == 200
    data = response.json()
    assert data["task"] == "vqa"
    assert "answer" in data
    assert data["confidence"] > 0
    assert len(data["trace"]) >= 4


def test_end_to_end_change_vqa_analysis():
    response = client.post("/api/v1/analyze", json={
        "query": "What changed between these two images?",
        "image_ids": ["sample_change_2024_t1.png", "sample_change_2026_t2.png"]
    })
    assert response.status_code == 200
    data = response.json()
    assert data["task"] == "change_vqa"
    assert len(data["evidence"]) >= 1
    assert data["statistics"]["changed_percentage"] > 0
