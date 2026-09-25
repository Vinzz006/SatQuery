import os
import uuid
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
import numpy as np
from PIL import Image
import rasterio
from rasterio.enums import Resampling

from app.config import settings
from app.schemas.analysis import ImageMetadata, ModalityType


def extract_raster_metadata(file_path: Path, original_name: str) -> Tuple[ImageMetadata, np.ndarray]:
    """
    Extracts complete geospatial and image metadata using Rasterio or PIL fallback.
    Returns the ImageMetadata schema and a normalized RGB/Grayscale numpy array (H, W, C or H, W).
    """
    file_id = str(uuid.uuid4())[:8]
    file_size = os.path.getsize(file_path)
    preview_filename = f"preview_{file_id}.png"
    preview_path = settings.ARTIFACT_DIR / preview_filename

    has_geotiff = False
    crs_str = None
    bounds_dict = None
    res = None
    bands_count = 1
    width = 0
    height = 0

    try:
        # Try rasterio first for true geospatial rasters
        with rasterio.open(file_path) as src:
            width = src.width
            height = src.height
            bands_count = src.count
            
            if src.crs is not None:
                has_geotiff = True
                crs_str = src.crs.to_string()
                b = src.bounds
                bounds_dict = {"minx": b.left, "miny": b.bottom, "maxx": b.right, "maxy": b.top}
                res = [float(src.res[0]), float(src.res[1])]

            # Read bands for display preview and downstream processing
            # If 3 or more bands, read first 3 (e.g. RGB or NIR-R-G)
            if bands_count >= 3:
                raw_data = src.read([1, 2, 3])  # Shape: (3, H, W)
                img_array = np.transpose(raw_data, (1, 2, 0))  # Shape: (H, W, 3)
            elif bands_count == 2:
                # E.g. Dual-pol SAR (VV, VH)
                raw_data = src.read([1, 2])
                img_array = np.transpose(raw_data, (1, 2, 0))
            else:
                raw_data = src.read(1)  # Single band (e.g. SAR amplitude or Panchromatic)
                img_array = raw_data

    except Exception:
        # Fallback to PIL for regular benchmark images (PNG, JPEG)
        with Image.open(file_path) as pil_img:
            width, height = pil_img.size
            bands_count = len(pil_img.getbands())
            img_array = np.array(pil_img)

    # Normalize image array for preview generation and computer vision
    preview_img_array = normalize_for_display(img_array)
    preview_pil = Image.fromarray(preview_img_array)
    # Resize preview if huge
    if max(preview_pil.size) > 1024:
        preview_pil.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
    preview_pil.save(preview_path, format="PNG")

    # Detect preliminary modality based on bands and radiometric properties
    from app.remote_sensing.modality import detect_modality
    modality = detect_modality(img_array, bands_count, file_path.name)

    metadata = ImageMetadata(
        id=file_id,
        filename=file_path.name,
        original_name=original_name,
        file_path=str(file_path),
        width=width,
        height=height,
        bands=bands_count,
        crs=crs_str,
        bounds=bounds_dict,
        resolution=res,
        modality=modality,
        file_size_bytes=file_size,
        has_geotiff_metadata=has_geotiff,
        preview_url=f"/api/v1/artifacts/{preview_filename}"
    )

    return metadata, img_array


def normalize_for_display(arr: np.ndarray) -> np.ndarray:
    """
    Normalizes any bit-depth (uint16, float32, int32) or multi-band array
    to an 8-bit unsigned uint8 array (0-255) using 2%-98% percentile stretching.
    """
    if arr.ndim == 2:
        # Single band
        valid_mask = np.isfinite(arr)
        if not np.any(valid_mask):
            return np.zeros_like(arr, dtype=np.uint8)
        p2, p98 = np.percentile(arr[valid_mask], (2, 98))
        if p98 > p2:
            stretched = np.clip((arr - p2) / (p98 - p2) * 255.0, 0, 255).astype(np.uint8)
        elif arr.max() > arr.min():
            stretched = np.clip((arr - arr.min()) / (arr.max() - arr.min()) * 255.0, 0, 255).astype(np.uint8)
        else:
            stretched = np.clip(arr, 0, 255).astype(np.uint8)
        return stretched

    elif arr.ndim == 3:
        # Multi-band
        h, w, c = arr.shape
        out = np.zeros((h, w, min(c, 3)), dtype=np.uint8)
        channels_to_process = min(c, 3)
        for i in range(channels_to_process):
            ch = arr[:, :, i]
            valid_mask = np.isfinite(ch)
            if np.any(valid_mask):
                p2, p98 = np.percentile(ch[valid_mask], (2, 98))
                if p98 > p2:
                    out[:, :, i] = np.clip((ch - p2) / (p98 - p2) * 255.0, 0, 255).astype(np.uint8)
                elif ch.max() > ch.min():
                    out[:, :, i] = np.clip((ch - ch.min()) / (ch.max() - ch.min()) * 255.0, 0, 255).astype(np.uint8)
                else:
                    out[:, :, i] = np.clip(ch, 0, 255).astype(np.uint8)
            else:
                out[:, :, i] = 0
        if channels_to_process == 1:
            return out[:, :, 0]
        return out

    return np.zeros((100, 100), dtype=np.uint8)
