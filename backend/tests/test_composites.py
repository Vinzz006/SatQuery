import numpy as np
import pytest
from app.remote_sensing.composites import (
    generate_false_color_infrared,
    generate_agriculture_composite,
    save_composite_artifact
)
from app.models.composite import MultiSpectralCompositeSpecialist
from app.schemas.analysis import ImageMetadata, ModalityType, TaskType
from app.agent.router import QueryRouter


def test_false_color_infrared_generation():
    arr = np.zeros((100, 100, 3), dtype=np.uint8)
    arr[:, :, 1] = 200  # High green (vegetation)
    arr[:, :, 0] = 50
    arr[:, :, 2] = 40

    cir, stats = generate_false_color_infrared(arr)
    assert cir.shape == (100, 100, 3)
    # In CIR, vegetation should have highest intensity in Red channel (NIR mapped to R)
    assert np.mean(cir[:, :, 0]) > np.mean(cir[:, :, 1])
    assert stats["composite_type"] == "False-Color Infrared (CIR)"


def test_agriculture_composite_generation():
    arr = np.zeros((80, 80, 3), dtype=np.uint8)
    arr[:, :, 1] = 180
    agri, stats = generate_agriculture_composite(arr)
    assert agri.shape == (80, 80, 3)
    assert "Agriculture" in stats["composite_type"]


def test_composite_specialist_and_router():
    specialist = MultiSpectralCompositeSpecialist()
    meta = ImageMetadata(
        id="test_meta",
        filename="test.png",
        original_name="test.png",
        file_path="",
        width=64,
        height=64,
        bands=3,
        modality=ModalityType.OPTICAL,
        file_size_bytes=1024
    )
    arr = np.ones((64, 64, 3), dtype=np.uint8) * 120

    res = specialist.predict(arr, meta, "Generate false color infrared composite")
    assert "answer" in res
    assert res["confidence"] >= 0.90
    assert len(res["evidence"]) == 1
    assert res["evidence"][0].type == "fused_composite"

    # Router check
    task, key, _ = QueryRouter.route(
        query="Show me the color infrared (CIR) composite",
        num_images=1,
        modalities=[ModalityType.OPTICAL]
    )
    assert task == TaskType.BAND_COMPOSITE
    assert key == "composite"
