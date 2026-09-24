import uuid
from typing import Dict, Any
import numpy as np
import cv2
from PIL import Image

from app.config import settings
from app.schemas.analysis import EvidenceArtifact


def generate_optical_sar_composite(
    optical_rgb: np.ndarray,
    sar_filtered: np.ndarray,
    built_up_mask: np.ndarray
) -> EvidenceArtifact:
    """
    Creates an aerospace-grade Optical + SAR false-color fusion composite:
    - Band 1 (R): Optical Red (reflectance)
    - Band 2 (G): Optical Green (vegetation)
    - Band 3 (B): SAR Backscatter Amplitude (structure/dielectric properties)
    With built-up high-backscatter structures highlighted in vibrant amber/cyan.
    """
    art_id = str(uuid.uuid4())[:8]
    h, w = optical_rgb.shape[:2]

    opt = optical_rgb.copy()
    if opt.ndim == 2:
        opt = cv2.cvtColor(opt, cv2.COLOR_GRAY2RGB)

    sar = sar_filtered.copy()
    if sar.ndim == 3:
        sar = sar[:, :, 0]
    sar_resized = cv2.resize(sar, (w, h), interpolation=cv2.INTER_LINEAR)

    # Cross-modal composite: Optical channels + SAR channel
    composite = np.zeros((h, w, 3), dtype=np.uint8)
    composite[:, :, 0] = opt[:, :, 0]  # Red: Optical Red
    composite[:, :, 1] = opt[:, :, 1]  # Green: Optical Green
    composite[:, :, 2] = sar_resized   # Blue: SAR Backscatter

    # Highlight fused detected built-up regions with distinct contours
    contours, _ = cv2.findContours(built_up_mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(composite, contours, -1, (245, 158, 11), 1)  # Amber contours

    filename = f"optical_sar_fused_{art_id}.png"
    filepath = settings.ARTIFACT_DIR / filename
    Image.fromarray(composite).save(filepath, format="PNG")

    return EvidenceArtifact(
        id=f"art_fused_{art_id}",
        type="fused_composite",
        title="Optical-SAR Cross-Modal Composite",
        description="Dual-sensor false color composite combining optical spectral reflectance with SAR microwave backscatter to resolve structures through atmospheric occlusion.",
        url=f"/api/v1/artifacts/{filename}",
        properties={
            "channels": "R: Optical Red, G: Optical Green, B: SAR Backscatter",
            "detected_structures_count": len(contours)
        }
    )
