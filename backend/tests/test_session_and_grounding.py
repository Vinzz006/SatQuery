import pytest
import numpy as np
from pathlib import Path
from app.agent.controller import agent_controller, get_session, clear_session
from app.models.grounding import TextGuidedGroundingSpecialist
from app.evidence.geojson_export import generate_geojson
from app.schemas.analysis import ImageMetadata, ModalityType, AnalyzeResponse, TaskType
from app.config import settings


def test_session_creation_and_memory():
    sample_file = settings.SAMPLE_DIR / "sample_vqa_optical.png"
    if not sample_file.exists():
        pytest.skip("Sample file not yet materialized")

    session_id = "test-session-isro-001"
    clear_session(session_id)

    # Turn 1
    resp1 = agent_controller.process_query(
        query="What type of land cover dominates this region?",
        image_paths=[sample_file],
        session_id=session_id
    )

    assert resp1.status == "success"
    assert resp1.session_id == session_id

    session = get_session(session_id)
    assert session is not None
    assert len(session.messages) == 2
    assert session.messages[0].role == "user"
    assert session.messages[1].role == "assistant"

    # Turn 2: Follow-up query
    resp2 = agent_controller.process_query(
        query="What about the surrounding water bodies?",
        image_paths=[sample_file],
        session_id=session_id
    )

    assert resp2.status == "success"
    assert resp2.session_id == session_id

    session = get_session(session_id)
    assert len(session.messages) == 4
    # Check trace includes conversational memory step
    trace_names = [step.name for step in resp2.trace]
    assert any("Conversational Memory Loaded" in name for name in trace_names)

    # Clean up
    assert clear_session(session_id) is True
    assert get_session(session_id) is None


def test_aerospace_grounding_and_area():
    specialist = TextGuidedGroundingSpecialist()

    # Create dummy image with simulated launch pad (high-contrast circle)
    img = np.ones((512, 512, 3), dtype=np.uint8) * 80
    import cv2
    cv2.circle(img, (256, 256), 40, (220, 220, 230), -1)
    cv2.circle(img, (256, 256), 16, (30, 30, 30), -1)

    meta = ImageMetadata(
        id="test_meta",
        filename="test_spaceport.png",
        original_name="test_spaceport.png",
        file_path="storage/samples/test_spaceport.png",
        width=512,
        height=512,
        bands=3,
        modality=ModalityType.OPTICAL,
        file_size_bytes=1024,
        bounds={"minx": 80.20, "maxx": 80.25, "miny": 13.70, "maxy": 13.75}
    )

    result = specialist.predict(img, meta, "Highlight launch pad and compute area")

    assert result["task"] == "grounding"
    assert "launch" in result["target"]
    assert "statistics" in result
    stats = result["statistics"]
    assert "detected_features" in stats
    assert "total_area_hectares" in stats
    assert stats["total_area_hectares"] > 0
    assert len(stats["detected_features"]) > 0

    first_feat = stats["detected_features"][0]
    assert "area_hectares" in first_feat
    assert "area_km2" in first_feat
    assert "centroid" in first_feat
    assert len(first_feat["centroid"]) == 2
    assert "hectares" in result["answer"].lower()


def test_geojson_export_with_detected_features():
    from app.schemas.analysis import EvidenceArtifact

    meta = ImageMetadata(
        id="test_meta",
        filename="test.png",
        original_name="test.png",
        file_path="storage/samples/test.png",
        width=512,
        height=512,
        bands=3,
        modality=ModalityType.OPTICAL,
        file_size_bytes=1024,
        bounds={"minx": 80.20, "maxx": 80.25, "miny": 13.70, "maxy": 13.75}
    )

    resp = AnalyzeResponse(
        id="resp1234",
        task=TaskType.GROUNDING,
        query="Highlight launch complex",
        answer="Found launch complex.",
        confidence=0.92,
        confidence_label="92%",
        models=["SatQuery-Grounding-v1"],
        images=[meta],
        evidence=[],
        trace=[],
        statistics={
            "detected_features": [
                {
                    "id": "feat_1",
                    "label": "Launch Complex #1",
                    "score": 0.94,
                    "area_hectares": 12.5,
                    "area_km2": 0.125,
                    "perimeter_m": 1250.0,
                    "centroid": [13.7335, 80.2351],
                    "box_2d": [0.2, 0.3, 0.4, 0.5],
                    "polygon_coords": [
                        [80.23, 13.73],
                        [80.24, 13.73],
                        [80.24, 13.74],
                        [80.23, 13.74],
                        [80.23, 13.73]
                    ]
                }
            ]
        },
        execution_time_ms=120.0
    )

    geojson_doc = generate_geojson(resp)

    assert geojson_doc["type"] == "FeatureCollection"
    # Should contain footprint + 1 detected target
    assert len(geojson_doc["features"]) >= 2
    target_feat = next(f for f in geojson_doc["features"] if f["properties"].get("feature_type") == "grounded_aerospace_target")
    assert target_feat["properties"]["area_hectares"] == 12.5
    assert target_feat["properties"]["centroid_lat"] == 13.7335
