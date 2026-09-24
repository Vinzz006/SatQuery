from pathlib import Path
import numpy as np
from app.evidence.timelapse import generate_change_timelapse
from app.config import settings


def test_change_timelapse_generation():
    img_a = np.ones((80, 80, 3), dtype=np.uint8) * 100
    img_b = np.ones((80, 80, 3), dtype=np.uint8) * 150
    diff_mask = np.zeros((80, 80), dtype=np.uint8)
    diff_mask[20:40, 20:40] = 255

    filename, artifact = generate_change_timelapse(
        img_a, img_b,
        diff_mask=diff_mask,
        label_a="Epoch 2024",
        label_b="Epoch 2026"
    )

    out_file = settings.ARTIFACT_DIR / filename
    assert out_file.exists()
    assert out_file.stat().st_size > 0
    assert filename.endswith(".gif")
    assert artifact.type == "timelapse_animation"
    assert artifact.properties["frame_count"] > 5
