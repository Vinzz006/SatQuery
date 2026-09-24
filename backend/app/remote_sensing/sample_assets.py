import numpy as np
import cv2
from PIL import Image
from pathlib import Path

from app.config import settings


def generate_sample_satellite_assets():
    """
    Creates high-fidelity remote sensing sample scenes directly in storage/samples
    enabling out-of-the-box demonstration of all 5 ISRO challenge scenarios.
    """
    sample_dir = settings.SAMPLE_DIR
    sample_dir.mkdir(parents=True, exist_ok=True)
    h, w = 512, 512
    np.random.seed(101)

    # 1. Single Optical Scene: Urban Harbor & Water
    # Blue water body in the left half, urban/industrial grid in the right half
    img_vqa = np.zeros((h, w, 3), dtype=np.uint8)
    # Water on left
    img_vqa[:, :200] = [35, 75, 130]  # Deep ocean/bay blue
    # Add gentle water wave texture
    water_noise = np.random.normal(0, 8, (h, 200, 3)).astype(np.int16)
    img_vqa[:, :200] = np.clip(img_vqa[:, :200].astype(np.int16) + water_noise, 0, 255).astype(np.uint8)

    # Shoreline
    img_vqa[:, 195:205] = [170, 160, 140]

    # Land / Urban on right
    img_vqa[:, 205:] = [140, 145, 150]  # Concrete / roads
    # Draw urban street grid and buildings
    for x in range(230, w - 20, 45):
        cv2.line(img_vqa, (x, 0), (x, h), (80, 80, 85), 4)  # Roads
    for y in range(30, h - 20, 50):
        cv2.line(img_vqa, (205, y), (w, y), (80, 80, 85), 4)

    # Draw industrial warehouses and buildings
    for bx in range(240, w - 50, 45):
        for by in range(40, h - 50, 50):
            color = np.random.choice([210, 190, 160, 120])
            cv2.rectangle(img_vqa, (bx, by), (bx + 28, by + 32), (int(color), int(color * 0.9), int(color * 0.8)), -1)

    Image.fromarray(img_vqa).save(sample_dir / "sample_vqa_optical.png")

    # 2. Agricultural & Water Grounding Scene
    # Green fields with a serpentine river / reservoir
    img_ground = np.zeros((h, w, 3), dtype=np.uint8)
    img_ground[:] = [45, 135, 60]  # Lush agricultural green

    # Add parcel boundaries
    for px in range(0, w, 70):
        cv2.line(img_ground, (px, 0), (px, h), (120, 110, 80), 2)
    for py in range(0, h, 60):
        cv2.line(img_ground, (0, py), (w, py), (120, 110, 80), 2)

    # Draw meandering water reservoir
    pts = np.array([[120, 50], [210, 140], [280, 230], [260, 340], [380, 450]], np.int32)
    for i in range(len(pts) - 1):
        cv2.line(img_ground, tuple(pts[i]), tuple(pts[i+1]), (25, 95, 175), 35)
    cv2.circle(img_ground, (260, 320), 45, (25, 95, 175), -1)

    Image.fromarray(img_ground).save(sample_dir / "sample_grounding_fields.png")

    # 3. Bi-temporal Pair (T1: Pre-Expansion 2024, T2: Post-Expansion 2026)
    # T1: Natural green landscape with sparse farm houses
    img_t1 = np.zeros((h, w, 3), dtype=np.uint8)
    img_t1[:] = [60, 140, 70]  # Vegetation
    cv2.rectangle(img_t1, (50, 50), (140, 140), (160, 150, 140), -1)  # Small farm
    Image.fromarray(img_t1).save(sample_dir / "sample_change_2024_t1.png")

    # T2: Major commercial built-up expansion in central sector
    img_t2 = img_t1.copy()
    # Deforestation & new large industrial facility (14.5% area change)
    cv2.rectangle(img_t2, (180, 160), (440, 380), (185, 185, 190), -1)  # Concrete pad
    # New warehouse buildings
    cv2.rectangle(img_t2, (200, 180), (320, 260), (220, 80, 60), -1)    # Red roof factory
    cv2.rectangle(img_t2, (200, 280), (420, 360), (100, 140, 210), -1)  # Blue logistics center
    cv2.line(img_t2, (0, 270), (180, 270), (70, 70, 70), 8)             # New connecting highway
    Image.fromarray(img_t2).save(sample_dir / "sample_change_2026_t2.png")

    # 4. Optical + SAR Co-registered Pair
    # Optical: Hazy/cloud-covered port with buildings partly obscured
    img_opt = img_vqa.copy()
    # Add semi-transparent atmospheric cloud layer
    cloud = np.zeros((h, w, 3), dtype=np.uint8)
    cv2.circle(cloud, (320, 250), 120, (250, 250, 255), -1)
    cloud = cv2.GaussianBlur(cloud, (51, 51), 0)
    img_opt = cv2.addWeighted(img_opt, 0.70, cloud, 0.30, 0)
    Image.fromarray(img_opt).save(sample_dir / "sample_optical_cloudy.png")

    # SAR: Single-channel radar backscatter
    # Pierces through clouds completely!
    # Water: low backscatter (dark ~25)
    # Land: medium backscatter (speckled ~90)
    # Corner reflectors (industrial steel/buildings): very bright (~240)
    sar = np.random.gamma(shape=2.0, scale=35.0, size=(h, w)).astype(np.uint8)
    sar[:, :200] = np.random.gamma(shape=1.0, scale=15.0, size=(h, 200)).astype(np.uint8)  # Water is dark
    # Buildings have intense double-bounce backscatter
    for bx in range(240, w - 50, 45):
        for by in range(40, h - 50, 50):
            sar[by:by+32, bx:bx+28] = np.random.randint(220, 255, (32, 28))

    Image.fromarray(sar).save(sample_dir / "sample_sar_backscatter.png")
    print("Sample satellite assets successfully materialized in storage/samples.")


if __name__ == "__main__":
    generate_sample_satellite_assets()
