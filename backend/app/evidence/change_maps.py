import uuid
from pathlib import Path
from typing import Tuple, Dict, Any
import numpy as np
import cv2
from PIL import Image

from app.config import settings
from app.schemas.analysis import EvidenceArtifact


def generate_change_evidence(
    img_a: np.ndarray,
    img_b: np.ndarray,
    binary_diff_mask: np.ndarray,
    change_stats: Dict[str, Any]
) -> Tuple[EvidenceArtifact, EvidenceArtifact]:
    """
    Generates two visual evidence artifacts:
    1. A discrete color-coded change map (Red = Built-up / Ground Change, Black = Unchanged).
    2. An alpha-blended overlay onto Image B (the post-event image).
    """
    art_id = str(uuid.uuid4())[:8]
    h, w = binary_diff_mask.shape[:2]

    # 1. Color-coded Change Map
    # Background: dark slate; Changed pixels: bright radiant crimson/red #EF4444 (BGR: 68, 68, 239)
    change_map_rgb = np.zeros((h, w, 3), dtype=np.uint8)
    change_map_rgb[:] = (20, 24, 33)  # Dark background
    change_map_rgb[binary_diff_mask > 0] = (239, 68, 68)  # Crimson change

    # Highlight perimeter/contours of changes
    contours, _ = cv2.findContours(binary_diff_mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(change_map_rgb, contours, -1, (255, 200, 0), 1)  # Yellow border

    change_map_filename = f"change_map_{art_id}.png"
    change_map_path = settings.ARTIFACT_DIR / change_map_filename
    Image.fromarray(change_map_rgb).save(change_map_path, format="PNG")

    map_artifact = EvidenceArtifact(
        id=f"art_cmap_{art_id}",
        type="change_map",
        title="Bi-Temporal Change Map",
        description=f"Delineated change areas representing {change_stats.get('changed_percentage', 0.0)}% total scene variation.",
        url=f"/api/v1/artifacts/{change_map_filename}",
        properties={
            "changed_pixels": int(change_stats.get("changed_pixels", 0)),
            "changed_percentage": float(change_stats.get("changed_percentage", 0.0)),
            "change_type": change_stats.get("primary_change_type", "surface_modification")
        }
    )

    # 2. Alpha-blended Overlay onto Post-event Image B
    base_b = img_b.copy()
    if base_b.ndim == 2:
        base_b = cv2.cvtColor(base_b, cv2.COLOR_GRAY2RGB)
    elif base_b.ndim == 3 and base_b.shape[2] == 1:
        base_b = cv2.cvtColor(base_b[:, :, 0], cv2.COLOR_GRAY2RGB)

    overlay = base_b.copy()
    overlay[binary_diff_mask > 0] = [255, 50, 50]  # Red tint for change

    # Blend with 65% base, 35% overlay
    blended = cv2.addWeighted(base_b, 0.65, overlay, 0.35, 0)
    cv2.drawContours(blended, contours, -1, (0, 255, 255), 1)  # Cyan boundary

    overlay_filename = f"change_overlay_{art_id}.png"
    overlay_path = settings.ARTIFACT_DIR / overlay_filename
    Image.fromarray(blended).save(overlay_path, format="PNG")

    overlay_artifact = EvidenceArtifact(
        id=f"art_cover_{art_id}",
        type="overlay",
        title="Change Detection Overlay",
        description="Semi-transparent change overlay registered over the post-observation imagery.",
        url=f"/api/v1/artifacts/{overlay_filename}",
        properties={"opacity": 0.35, "reference_image": "Observation B"}
    )

    return map_artifact, overlay_artifact
