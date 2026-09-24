import uuid
from pathlib import Path
from typing import Tuple, List, Optional
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

from app.config import settings
from app.schemas.analysis import EvidenceArtifact


def draw_hud_header(img: Image.Image, title: str, subtitle: str, color_tag: str = "#22d3ee") -> Image.Image:
    """Draws an aerospace HUD metadata banner across the top of an animation frame."""
    canvas = img.copy()
    draw = ImageDraw.Draw(canvas)
    w, h = canvas.size

    # Dark translucent banner at the top
    banner_h = 36
    draw.rectangle([0, 0, w, banner_h], fill=(11, 15, 25, 230))
    draw.line([0, banner_h, w, banner_h], fill=(30, 41, 59), width=1)

    # Indicator pip
    draw.rectangle([8, 10, 14, 26], fill=color_tag)

    # Text overlay
    draw.text((22, 6), title, fill=(241, 245, 249))
    draw.text((22, 20), subtitle, fill=(148, 163, 184))

    return canvas


def generate_change_timelapse(
    img_a: np.ndarray,
    img_b: np.ndarray,
    diff_mask: Optional[np.ndarray] = None,
    label_a: str = "EPOCH 1 (PRE-EVENT)",
    label_b: str = "EPOCH 2 (POST-EVENT)"
) -> Tuple[str, EvidenceArtifact]:
    """
    Renders an animated multi-frame bi-temporal timelapse transition:
    - Cycles between Epoch A, morphing cross-dissolve, Epoch B, and change delta highlights.
    - Saves as an animated GIF/WebP artifact with embedded HUD banners.
    """
    art_id = str(uuid.uuid4())[:8]
    filename = f"timelapse_{art_id}.gif"
    out_path = settings.ARTIFACT_DIR / filename

    # Standardize image dimensions
    h_a, w_a = img_a.shape[:2]
    h_b, w_b = img_b.shape[:2]
    h, w = min(h_a, h_b), min(w_a, w_b)

    # Normalize to RGB uint8
    def to_rgb(arr):
        if arr.ndim == 2:
            return cv2.cvtColor(arr, cv2.COLOR_GRAY2RGB)
        elif arr.ndim == 3 and arr.shape[2] == 1:
            return cv2.cvtColor(arr[:, :, 0], cv2.COLOR_GRAY2RGB)
        return arr[:, :, :3]

    rgb_a = cv2.resize(to_rgb(img_a), (w, h))
    rgb_b = cv2.resize(to_rgb(img_b), (w, h))

    frames: List[Image.Image] = []
    pil_a = Image.fromarray(rgb_a)
    pil_b = Image.fromarray(rgb_b)

    # 1. Epoch A Hold Frames (3 frames for visual dwell)
    frame_a = draw_hud_header(pil_a, f"SATQUERY TIME-SERIES | {label_a}", "Optical Baseline Observation", "#38bdf8")
    for _ in range(3):
        frames.append(frame_a)

    # 2. Morph Cross-Dissolve Frames (Transition A -> B)
    for alpha in [0.25, 0.50, 0.75]:
        blend = cv2.addWeighted(rgb_a, 1.0 - alpha, rgb_b, alpha, 0)
        pil_blend = Image.fromarray(blend)
        frame_blend = draw_hud_header(
            pil_blend,
            "CROSS-EPOCH MORPH DISSOLVE",
            f"Temporal Interpolation ({int(alpha * 100)}% Epoch B)",
            "#f59e0b"
        )
        frames.append(frame_blend)

    # 3. Epoch B Hold Frames (3 frames for visual dwell)
    frame_b = draw_hud_header(pil_b, f"SATQUERY TIME-SERIES | {label_b}", "Post-Evolution Observation", "#34d399")
    for _ in range(3):
        frames.append(frame_b)

    # 4. Highlighted Change Delta Frame if mask provided
    if diff_mask is not None:
        mask_resized = cv2.resize(diff_mask.astype(np.uint8), (w, h))
        delta_view = rgb_b.copy()
        # Tint change areas in radiant red/crimson
        delta_view[mask_resized > 0] = (
            delta_view[mask_resized > 0] * 0.4 + np.array([239, 68, 68]) * 0.6
        ).astype(np.uint8)
        pil_delta = Image.fromarray(delta_view)
        frame_delta = draw_hud_header(
            pil_delta,
            "TIME-SERIES CHANGE DELTA DELINEATION",
            "CVA Physical Variation Mask Applied",
            "#ef4444"
        )
        for _ in range(3):
            frames.append(frame_delta)

    # Save animated GIF (loop=0 means infinite loop)
    frames[0].save(
        out_path,
        save_all=True,
        append_images=frames[1:],
        duration=400,  # 400ms per frame
        loop=0,
        optimize=True
    )

    artifact = EvidenceArtifact(
        id=f"art_timelapse_{art_id}",
        type="timelapse_animation",
        title="Bi-Temporal Time-Series Timelapse",
        description="Multi-epoch animated cross-dissolve with timestamped HUD tickers and change delta highlight.",
        url=f"/api/v1/artifacts/{filename}",
        properties={
            "frame_count": len(frames),
            "frame_rate_ms": 400,
            "format": "GIF/WebP Animated"
        }
    )

    return filename, artifact
