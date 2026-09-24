import pytest
import numpy as np
from app.remote_sensing.modality import detect_modality
from app.schemas.analysis import ModalityType
from app.remote_sensing.preprocessing import apply_lee_filter, prepare_for_vision_model


def test_modality_detection_optical():
    # 3-channel distinct values -> Optical
    rgb = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
    mod = detect_modality(rgb, bands_count=3, filename="sentinel2_scene.png")
    assert mod in [ModalityType.OPTICAL, ModalityType.MULTISPECTRAL]


def test_modality_detection_sar():
    # 1-channel or filename with 'sar' or 's1' -> SAR
    single_ch = np.random.gamma(2.0, 30.0, (100, 100)).astype(np.uint8)
    mod = detect_modality(single_ch, bands_count=1, filename="s1_vv_amplitude.tif")
    assert mod == ModalityType.SAR


def test_lee_filter_execution():
    sar_noise = np.random.gamma(2.0, 30.0, (100, 100)).astype(np.uint8)
    filtered = apply_lee_filter(sar_noise, size=5)
    assert filtered.shape == (100, 100)
    assert filtered.dtype == np.uint8
    # Noise variance should decrease after Lee filtering
    assert np.var(filtered.astype(float)) <= np.var(sar_noise.astype(float)) + 10.0


def test_prepare_for_vision_model():
    single_ch = np.zeros((120, 120), dtype=np.uint8)
    pil_img = prepare_for_vision_model(single_ch, is_sar=True, target_size=(256, 256))
    assert pil_img.size == (256, 256)
    assert pil_img.mode == "RGB"
