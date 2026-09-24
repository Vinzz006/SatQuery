import uuid
from typing import List, Dict, Any, Tuple
import numpy as np
import cv2
from PIL import Image

from app.config import settings
from app.schemas.analysis import EvidenceArtifact, BoundingBox


def generate_bounding_box_evidence(
    img_array: np.ndarray,
    boxes: List[BoundingBox],
    query_target: str
) -> EvidenceArtifact:
    """
    Renders aerospace-grade visual bounding boxes with labels and confidence meters.
    """
    art_id = str(uuid.uuid4())[:8]
    h, w = img_array.shape[:2]

    canvas = img_array.copy()
    if canvas.ndim == 2:
        canvas = cv2.cvtColor(canvas, cv2.COLOR_GRAY2RGB)
    elif canvas.ndim == 3 and canvas.shape[2] == 1:
        canvas = cv2.cvtColor(canvas[:, :, 0], cv2.COLOR_GRAY2RGB)

    overlay = canvas.copy()

    # Colors for aerospace HUD: Cyan/Neon Blue #06B6D4, Amber #F59E0B, Emerald #10B981
    box_color = (6, 182, 212)      # Cyan RGB (212, 182, 6) in BGR
    text_color = (255, 255, 255)

    for i, b in enumerate(boxes):
        # b.box_2d is [ymin, xmin, ymax, xmax] normalized (0 to 1) or pixel
        ymin, xmin, ymax, xmax = b.box_2d
        if max(ymin, xmin, ymax, xmax) <= 1.05:
            # Normalized coordinates
            y1, x1, y2, x2 = int(ymin * h), int(xmin * w), int(ymax * h), int(xmax * w)
        else:
            y1, x1, y2, x2 = int(ymin), int(xmin), int(ymax), int(xmax)

        # Clamp
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w - 1, x2), min(h - 1, y2)

        # Draw semi-transparent fill
        cv2.rectangle(overlay, (x1, y1), (x2, y2), box_color, -1)

        # Draw crisp bounding box
        cv2.rectangle(canvas, (x1, y1), (x2, y2), box_color, 2)

        # Draw corner brackets for aerospace look
        bracket_len = min(15, (x2 - x1) // 3, (y2 - y1) // 3)
        if bracket_len > 3:
            # Top-left
            cv2.line(canvas, (x1, y1), (x1 + bracket_len, y1), (255, 255, 255), 2)
            cv2.line(canvas, (x1, y1), (x1, y1 + bracket_len), (255, 255, 255), 2)
            # Top-right
            cv2.line(canvas, (x2, y1), (x2 - bracket_len, y1), (255, 255, 255), 2)
            cv2.line(canvas, (x2, y1), (x2, y1 + bracket_len), (255, 255, 255), 2)
            # Bottom-left
            cv2.line(canvas, (x1, y2), (x1 + bracket_len, y2), (255, 255, 255), 2)
            cv2.line(canvas, (x1, y2), (x1, y2 - bracket_len), (255, 255, 255), 2)
            # Bottom-right
            cv2.line(canvas, (x2, y2), (x2 - bracket_len, y2), (255, 255, 255), 2)
            cv2.line(canvas, (x2, y2), (x2, y2 - bracket_len), (255, 255, 255), 2)

        # Label tag
        label_text = f"{b.label.upper()} {int(b.score * 100)}%"
        (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
        tag_y1 = max(0, y1 - th - 6)
        cv2.rectangle(canvas, (x1, tag_y1), (x1 + tw + 8, y1), (15, 23, 42), -1)  # dark slate bg
        cv2.rectangle(canvas, (x1, tag_y1), (x1 + tw + 8, y1), box_color, 1)
        cv2.putText(canvas, label_text, (x1 + 4, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.45, text_color, 1, cv2.LINE_AA)

    # 85% canvas, 15% fill overlay
    blended = cv2.addWeighted(canvas, 0.85, overlay, 0.15, 0)

    filename = f"grounding_bbox_{art_id}.png"
    filepath = settings.ARTIFACT_DIR / filename
    Image.fromarray(blended).save(filepath, format="PNG")

    return EvidenceArtifact(
        id=f"art_bbox_{art_id}",
        type="bounding_box",
        title=f"Target Grounding: '{query_target}'",
        description=f"Identified {len(boxes)} candidate region(s) matching '{query_target}' with high spatial confidence.",
        url=f"/api/v1/artifacts/{filename}",
        properties={
            "target": query_target,
            "region_count": len(boxes),
            "regions": [b.dict() for b in boxes]
        }
    )
