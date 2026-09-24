import numpy as np
import cv2
from PIL import Image
from scipy.ndimage import uniform_filter


def apply_lee_filter(sar_img: np.ndarray, size: int = 5) -> np.ndarray:
    """
    Applies the classic Lee filter to reduce multiplicative speckle noise in SAR imagery
    while preserving edge boundaries and strong point targets.
    Formula: R = Mean + K * (Center - Mean), where K = Var_local / (Var_local + Noise_var)
    """
    img = sar_img.astype(np.float32)
    mean = uniform_filter(img, (size, size))
    mean_sqr = uniform_filter(img ** 2, (size, size))
    var = np.maximum(mean_sqr - mean ** 2, 0)

    # Estimate overall speckle noise variance
    valid = img[img > 0]
    if len(valid) == 0:
        return sar_img
    noise_var = (np.std(valid) / (np.mean(valid) + 1e-6)) ** 2

    # Weighting factor K
    k = var / (var + noise_var * (mean ** 2) + 1e-6)
    k = np.clip(k, 0.0, 1.0)

    filtered = mean + k * (img - mean)
    return np.clip(filtered, 0, 255).astype(np.uint8)


def prepare_for_vision_model(img_array: np.ndarray, is_sar: bool = False, target_size: tuple = (512, 512)) -> Image.Image:
    """
    Preprocesses remote sensing array for computer vision models:
    - Normalizes bit depth
    - Applies Lee filtering if SAR
    - Converts single-channel to 3-channel RGB representation
    - Resizes to standard model dimension with high-quality resampling
    """
    from app.remote_sensing.geotiff import normalize_for_display

    normalized = normalize_for_display(img_array)

    if is_sar:
        if normalized.ndim == 2:
            normalized = apply_lee_filter(normalized)
        elif normalized.ndim == 3 and normalized.shape[2] == 1:
            filtered = apply_lee_filter(normalized[:, :, 0])
            normalized = np.expand_dims(filtered, axis=-1)

    # Ensure 3-channel RGB for transformers and vision backbones
    if normalized.ndim == 2:
        rgb_img = cv2.cvtColor(normalized, cv2.COLOR_GRAY2RGB)
    elif normalized.ndim == 3:
        if normalized.shape[2] == 1:
            rgb_img = cv2.cvtColor(normalized[:, :, 0], cv2.COLOR_GRAY2RGB)
        elif normalized.shape[2] == 2:
            # Dual pol (e.g. VV, VH) -> add ratio VV/VH as 3rd channel
            vv = normalized[:, :, 0].astype(float)
            vh = normalized[:, :, 1].astype(float)
            ratio = np.clip((vv / (vh + 1e-5)) * 128.0, 0, 255).astype(np.uint8)
            rgb_img = np.dstack([normalized[:, :, 0], normalized[:, :, 1], ratio])
        else:
            rgb_img = normalized[:, :, :3]
    else:
        rgb_img = np.zeros((target_size[1], target_size[0], 3), dtype=np.uint8)

    pil_img = Image.fromarray(rgb_img)
    if pil_img.size != target_size:
        pil_img = pil_img.resize(target_size, Image.Resampling.BILINEAR)

    return pil_img
