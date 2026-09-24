import numpy as np
from app.schemas.analysis import ModalityType


def detect_modality(img_array: np.ndarray, bands_count: int, filename: str = "") -> ModalityType:
    """
    Detects whether an input remote-sensing raster is Optical, SAR, or Multispectral
    using physical properties, band counts, speckle statistics, and file naming hints.
    """
    fn_lower = filename.lower()

    # Direct filename indicators
    if any(k in fn_lower for k in ["sar", "sentinel1", "sentinel-1", "s1_", "vv", "vh", "hh", "hv", "palsar", "radarsat"]):
        return ModalityType.SAR
    if any(k in fn_lower for k in ["optical", "rgb", "sentinel2", "sentinel-2", "s2_", "landsat", "naip"]):
        if bands_count > 3:
            return ModalityType.MULTISPECTRAL
        return ModalityType.OPTICAL

    # Band count rules
    if bands_count > 3:
        return ModalityType.MULTISPECTRAL

    if bands_count == 3:
        # Check if 3 channels are identical (grayscale stored as RGB)
        if img_array.ndim == 3 and img_array.shape[2] == 3:
            ch_diff_1 = np.mean(np.abs(img_array[:, :, 0].astype(float) - img_array[:, :, 1].astype(float)))
            ch_diff_2 = np.mean(np.abs(img_array[:, :, 1].astype(float) - img_array[:, :, 2].astype(float)))
            if ch_diff_1 < 1.0 and ch_diff_2 < 1.0:
                # Effectively single channel, analyze speckle
                return _check_sar_speckle(img_array[:, :, 0])
        return ModalityType.OPTICAL

    if bands_count in [1, 2]:
        # Single or dual polarization
        if img_array.ndim == 3:
            return _check_sar_speckle(img_array[:, :, 0])
        return _check_sar_speckle(img_array)

    return ModalityType.OPTICAL


def _check_sar_speckle(band: np.ndarray) -> ModalityType:
    """
    Calculates equivalent number of looks / coefficient of variation (std / mean).
    SAR imagery typically exhibits high local speckle noise and high dynamic range.
    """
    valid = band[np.isfinite(band) & (band > 0)]
    if len(valid) < 100:
        return ModalityType.SAR

    mean_val = float(np.mean(valid))
    std_val = float(np.std(valid))

    if mean_val > 0:
        cv = std_val / mean_val  # Coefficient of variation
        # In homogeneous SAR regions, CV is ~ 0.52 for single-look intensity.
        # Across entire scene with extreme backscatter peaks from corner reflectors, CV is often > 0.8
        if cv > 0.7:
            return ModalityType.SAR

    return ModalityType.OPTICAL
