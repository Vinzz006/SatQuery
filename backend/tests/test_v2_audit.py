import pytest
from pathlib import Path
from app.config import settings
from app.schemas.analysis import TaskType
from app.agent.router import QueryRouter
from app.agent.controller import agent_controller
from app.reports.pdf_generator import generate_pdf_report


def test_v2_version():
    """Verify v2.0.0 semantic version bump across backend."""
    assert settings.VERSION == "2.0.0"


def test_v2_audit_routing():
    """Verify QueryRouter routes comprehensive audit queries to SCENE_AUDIT."""
    queries = [
        "Run a comprehensive remote-sensing intelligence audit across the entire spaceport.",
        "Perform a full mission audit of this scene",
        "Generate a complete scene intelligence dossier",
        "Comprehensive analysis of operational facilities"
    ]
    for q in queries:
        task, key, rationale = QueryRouter.route(q, num_images=1, modalities=[])
        assert task == TaskType.SCENE_AUDIT
        assert key == "scene_audit"
        assert "Multi-Model" in rationale or "audit" in rationale.lower()


def test_v2_scene_audit_execution():
    """Verify agent_controller executes Multi-Model CoT across all specialists."""
    # Locate spaceport benchmark GeoTIFF or sample image
    sample_tif = settings.SAMPLE_DIR / "isro_sdsc_spaceport.tif"
    if not sample_tif.exists():
        sample_tif = settings.SAMPLE_DIR / "sample_spaceport.png"
    if not sample_tif.exists():
        sample_tif = settings.SAMPLE_DIR / "sample_optical.png"

    assert sample_tif.exists(), f"Sample image not found at {sample_tif}"

    query = "Run a comprehensive remote-sensing intelligence audit across the entire spaceport."
    resp = agent_controller.process_query(
        query=query,
        image_paths=[sample_tif],
        use_adapted_model=True
    )

    # Validate high-level response
    assert resp.status == "success"
    assert resp.task == TaskType.SCENE_AUDIT
    assert resp.confidence >= 0.90
    assert "Consensus" in resp.confidence_label

    # Validate multi-specialist models involved
    assert len(resp.models) >= 4
    model_str = " ".join(resp.models)
    assert "grounding" in model_str.lower()
    assert "spectral" in model_str.lower()
    assert "captioning" in model_str.lower() or "vqa" in model_str.lower()

    # Validate rich markdown answer sections
    assert "Comprehensive Remote-Sensing Intelligence Audit" in resp.answer
    assert "Synoptic Assessment" in resp.answer
    assert "Aerospace Infrastructure & Vector Grounding" in resp.answer
    assert "Radiometric & Spectral Health (NDVI)" in resp.answer
    assert "False-Color Infrared (CIR) Synthesis" in resp.answer

    # Validate evidence artifacts compiled
    evidence_types = [e.type for e in resp.evidence]
    assert "bounding_box" in evidence_types or "mask" in evidence_types or "overlay" in evidence_types
    assert "spectral_index" in evidence_types
    assert "fused_composite" in evidence_types or "band_composite" in evidence_types

    # Validate unified statistics
    stats = resp.statistics
    assert stats.get("audit_type") == "Multi-Model Scene Intelligence Dossier"
    assert "total_features" in stats
    assert "total_area_hectares" in stats
    assert "detected_features" in stats
    assert isinstance(stats["detected_features"], list)
    assert len(stats["detected_features"]) > 0

    feat0 = stats["detected_features"][0]
    assert "area_hectares" in feat0
    assert "area_km2" in feat0
    assert "perimeter_m" in feat0
    assert "centroid" in feat0
    assert "polygon_coords" in feat0

    # Validate PDF generation on SCENE_AUDIT response
    pdf_path = generate_pdf_report(resp)
    assert pdf_path.exists()
    assert pdf_path.stat().st_size > 1000
