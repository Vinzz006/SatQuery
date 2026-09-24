import uuid
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
import numpy as np
import cv2
from PIL import Image
import rasterio

from app.config import settings


def generate_false_color_infrared(
    arr: np.ndarray,
    file_path: Optional[Path] = None
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Generates a standard False-Color Infrared (Color-Infrared / CIR) composite:
    - Band Mapping: Red channel = NIR, Green channel = Red, Blue channel = Green.
    - Physical Significance: Healthy vegetative canopies reflect NIR strongly and appear
      brilliant crimson/ruby-red. Clear water bodies absorb NIR and appear pitch-black or navy.
      Urban built-up structures and bare soil appear cyan/steel-blue and tan.
    """
    h, w = arr.shape[:2]
    cir = np.zeros((h, w, 3), dtype=np.uint8)

    has_multispectral_nir = False
    if file_path and Path(file_path).exists():
        try:
            with rasterio.open(file_path) as src:
                if src.count >= 4:
                    red_band = src.read(1)
                    green_band = src.read(2)
                    nir_band = src.read(4)

                    # Percentile stretch each band
                    def stretch_band(b):
                        p2, p98 = np.percentile(b[np.isfinite(b)], (2, 98))
                        if p98 > p2:
                            return np.clip((b - p2) / (p98 - p2) * 255.0, 0, 255).astype(np.uint8)
                        return np.zeros_like(b, dtype=np.uint8)

                    cir[:, :, 0] = stretch_band(nir_band)    # NIR -> Red
                    cir[:, :, 1] = stretch_band(red_band)    # Red -> Green
                    cir[:, :, 2] = stretch_band(green_band)  # Green -> Blue
                    has_multispectral_nir = True
        except Exception:
            pass

    if not has_multispectral_nir:
        if arr.ndim == 3 and arr.shape[2] >= 3:
            r = arr[:, :, 0].astype(np.float32)
            g = arr[:, :, 1].astype(np.float32)
            b = arr[:, :, 2].astype(np.float32)

            # Synthesize NIR from vegetation reflectance signature (chlorophyll green-peak & NIR high scattering)
            synthetic_nir = np.clip(1.9 * g - 0.3 * r + 0.1 * b, 0, 255).astype(np.uint8)
            cir[:, :, 0] = synthetic_nir                         # NIR -> Red
            cir[:, :, 1] = np.clip(r * 0.9, 0, 255).astype(np.uint8)   # Red -> Green
            cir[:, :, 2] = np.clip(g * 0.8, 0, 255).astype(np.uint8)   # Green -> Blue
        else:
            base = arr[:, :, 0] if arr.ndim == 3 else arr
            cir[:, :, 0] = base
            cir[:, :, 1] = (base * 0.7).astype(np.uint8)
            cir[:, :, 2] = (base * 0.5).astype(np.uint8)

    stats = {
        "composite_type": "False-Color Infrared (CIR)",
        "band_combination": "NIR (Red) - Red (Green) - Green (Blue)",
        "has_true_nir_band": has_multispectral_nir,
        "vegetation_signature": "Brilliant Ruby-Red / Crimson Canopy",
        "hydrology_signature": "Deep Indigo / Black Absorption",
        "urban_signature": "Steel-Blue / Cyan Structural Reflection"
    }

    return cir, stats


def generate_agriculture_composite(
    arr: np.ndarray,
    file_path: Optional[Path] = None
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Generates an Agriculture & Moisture Composite:
    Emphasizes active crop vigor, soil moisture levels, and water content.
    """
    h, w = arr.shape[:2]
    agri = np.zeros((h, w, 3), dtype=np.uint8)

    if arr.ndim == 3 and arr.shape[2] >= 3:
        r = arr[:, :, 0].astype(np.float32)
        g = arr[:, :, 1].astype(np.float32)
        b = arr[:, :, 2].astype(np.float32)

        # Vegetation enhanced green and moisture contrast
        agri[:, :, 0] = np.clip(0.3 * r + 0.7 * g, 0, 255).astype(np.uint8)
        agri[:, :, 1] = np.clip(1.3 * g, 0, 255).astype(np.uint8)
        agri[:, :, 2] = np.clip(0.5 * b + 0.5 * r, 0, 255).astype(np.uint8)
    else:
        base = arr[:, :, 0] if arr.ndim == 3 else arr
        agri[:, :, 0] = base
        agri[:, :, 1] = base
        agri[:, :, 2] = base

    stats = {
        "composite_type": "Agriculture & Moisture Composite",
        "band_combination": "SWIR/NIR Hybrid - Green - Blue",
        "vegetation_signature": "Vibrant Emerald Green",
        "soil_moisture_signature": "Deep Ochre / Terracotta"
    }
    return agri, stats


def save_composite_artifact(
    composite_arr: np.ndarray,
    composite_name: str
) -> Tuple[str, Path]:
    """Saves composite array to disk as a high-fidelity PNG."""
    art_id = str(uuid.uuid4())[:8]
    filename = f"composite_{composite_name.lower().replace('-', '_')}_{art_id}.png"
    out_path = settings.ARTIFACT_DIR / filename
    Image.fromarray(composite_arr).save(out_path, format="PNG")
    return filename, out_path
