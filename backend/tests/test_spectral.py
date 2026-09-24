import numpy as np
import pytest
from app.remote_sensing.indices import compute_ndvi, compute_ndwi, compute_ndbi, generate_spectral_artifact
from app.models.spectral import SpectralIndexSpecialist
from app.schemas.analysis import ImageMetadata, ModalityType, TaskType
from app.agent.router import QueryRouter


def test_ndvi_computation():
    # Synthetic 100x100 RGB image with high green (vegetation)
    arr = np.zeros((100, 100, 3), dtype=np.uint8)
    arr[:, :, 1] = 220  # High green
    arr[:, :, 0] = 40   # Low red
    arr[:, :, 2] = 30   # Low blue

    ndvi = compute_ndvi(arr)
    assert ndvi.shape == (100, 100)
    assert np.all(ndvi >= -1.0) and np.all(ndvi <= 1.0)
    # Green vegetation should yield positive NDVI
    assert np.mean(ndvi) > 0.2


def test_ndwi_computation():
    # Synthetic 100x100 RGB image with high blue/green (water body)
    arr = np.zeros((100, 100, 3), dtype=np.uint8)
    arr[:, :, 2] = 200  # High blue
    arr[:, :, 1] = 180  # Moderate green
    arr[:, :, 0] = 30   # Low red

    ndwi = compute_ndwi(arr)
    assert ndwi.shape == (100, 100)
    assert np.all(ndwi >= -1.0) and np.all(ndwi <= 1.0)
    assert np.mean(ndwi) > 0.1


def test_ndbi_computation():
    # Synthetic 100x100 RGB image with high red/grey (built-up concrete)
    arr = np.zeros((100, 100, 3), dtype=np.uint8)
    arr[:, :, 0] = 210  # High red
    arr[:, :, 1] = 110  # Lower green
    arr[:, :, 2] = 110

    ndbi = compute_ndbi(arr)
    assert ndbi.shape == (100, 100)
    assert np.all(ndbi >= -1.0) and np.all(ndbi <= 1.0)
    assert np.mean(ndbi) > 0.05


def test_generate_spectral_artifact():
    fake_map = np.random.uniform(-0.5, 0.8, (64, 64)).astype(np.float32)
    filename, stats = generate_spectral_artifact(fake_map, "NDVI")

    assert filename.startswith("spectral_ndvi_")
    assert filename.endswith(".png")
    assert stats["index_type"] == "NDVI"
    assert "mean" in stats
    assert "high_vigor_canopy_pct" in stats


def test_spectral_specialist_and_router():
    specialist = SpectralIndexSpecialist()
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
    arr = np.ones((64, 64, 3), dtype=np.uint8) * 128

    res = specialist.predict(arr, meta, "Compute NDVI vegetation index across the spaceport")
    assert "answer" in res
    assert res["confidence"] >= 0.90
    assert len(res["evidence"]) == 1
    assert res["evidence"][0].type == "spectral_index"

    # Test router
    task, model_key, rationale = QueryRouter.route(
        query="Calculate NDVI and vegetation health",
        num_images=1,
        modalities=[ModalityType.OPTICAL]
    )
    assert task == TaskType.SPECTRAL_INDEX
    assert model_key == "spectral"
