import uuid
from typing import Tuple, Dict, Any
import numpy as np
import cv2
from PIL import Image

from app.config import settings
from app.schemas.analysis import EvidenceArtifact


def generate_mask_evidence(
    img_array: np.ndarray,
    binary_mask: np.ndarray,
    target_name: str,
    color_rgb: Tuple[int, int, int] = (56, 189, 248)  # Cyan #38BDF8
) -> Tuple[EvidenceArtifact, EvidenceArtifact]:
    """
    Creates:
    1. A binary mask artifact (black & white or colored mask).
    2. An alpha-blended overlay image onto the original satellite imagery.
    """
    art_id = str(uuid.uuid4())[:8]
    h, w = binary_mask.shape[:2]

    # 1. Mask image
    mask_rgb = np.zeros((h, w, 3), dtype=np.uint8)
    mask_rgb[binary_mask > 0] = color_rgb

    mask_filename = f"mask_{art_id}.png"
    mask_path = settings.ARTIFACT_DIR / mask_filename
    Image.fromarray(mask_rgb).save(mask_path, format="PNG")

    coverage_pct = float(np.sum(binary_mask > 0) / (h * w) * 100.0)

    mask_artifact = EvidenceArtifact(
        id=f"art_mask_{art_id}",
        type="mask",
        title=f"Segmentation Mask: {target_name.title()}",
        description=f"Delineated spatial boundary of '{target_name}' encompassing {coverage_pct:.2f}% of image area.",
        url=f"/api/v1/artifacts/{mask_filename}",
        properties={"target": target_name, "coverage_pct": round(coverage_pct, 2)}
    )

    # 2. Alpha-blended Overlay
    base = img_array.copy()
    if base.ndim == 2:
        base = cv2.cvtColor(base, cv2.COLOR_GRAY2RGB)
    elif base.ndim == 3 and base.shape[2] == 1:
        base = cv2.cvtColor(base[:, :, 0], cv2.COLOR_GRAY2RGB)

    overlay = base.copy()
    overlay[binary_mask > 0] = color_rgb
    blended = cv2.addWeighted(base, 0.60, overlay, 0.40, 0)

    # Contours
    contours, _ = cv2.findContours(binary_mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(blended, contours, -1, (255, 255, 255), 1)

    overlay_filename = f"overlay_{art_id}.png"
    overlay_path = settings.ARTIFACT_DIR / overlay_filename
    Image.fromarray(blended).save(overlay_path, format="PNG")

    overlay_artifact = EvidenceArtifact(
        id=f"art_over_{art_id}",
        type="overlay",
        title=f"Highlighted Overlay: {target_name.title()}",
        description=f"Semi-transparent overlay highlighting {target_name} boundaries over base imagery.",
        url=f"/api/v1/artifacts/{overlay_filename}",
        properties={"opacity": 0.40, "target": target_name}
    )

    return mask_artifact, overlay_artifact
