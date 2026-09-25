import numpy as np
import cv2
from PIL import Image
from pathlib import Path
import rasterio
from rasterio.transform import from_bounds

from app.config import settings


def generate_sample_satellite_assets():
    """
    Creates high-fidelity remote sensing sample scenes directly in storage/samples
    enabling out-of-the-box demonstration of all ISRO challenge scenarios.
    Generates both standard benchmark PNGs and true georeferenced GeoTIFF (.tif) rasters
    with EPSG:4326 CRS and spatial bounds over ISRO Satish Dhawan Space Centre (SDSC SHAR, Sriharikota, India).
    """
    sample_dir = settings.SAMPLE_DIR
    sample_dir.mkdir(parents=True, exist_ok=True)
    h, w = 512, 512
    np.random.seed(101)

    # Geographic bounding box for ISRO SDSC SHAR, Sriharikota, India (WGS84)
    # Sriharikota Island coordinates: ~13.70° N to 13.75° N, ~80.20° E to 80.25° E
    west, south, east, north = 80.2000, 13.7000, 80.2500, 13.7500
    geo_transform = from_bounds(west, south, east, north, w, h)
    crs_epsg = "EPSG:4326"

    # =========================================================================
    # 1. Single Optical Scene: Urban Harbor & Water
    # =========================================================================
    img_vqa = np.zeros((h, w, 3), dtype=np.uint8)
    img_vqa[:, :200] = [35, 75, 130]  # Deep ocean/bay blue
    water_noise = np.random.normal(0, 8, (h, 200, 3)).astype(np.int16)
    img_vqa[:, :200] = np.clip(img_vqa[:, :200].astype(np.int16) + water_noise, 0, 255).astype(np.uint8)
    img_vqa[:, 195:205] = [170, 160, 140]  # Shoreline
    img_vqa[:, 205:] = [140, 145, 150]  # Land

    for x in range(230, w - 20, 45):
        cv2.line(img_vqa, (x, 0), (x, h), (80, 80, 85), 4)
    for y in range(30, h - 20, 50):
        cv2.line(img_vqa, (205, y), (w, y), (80, 80, 85), 4)

    for bx in range(240, w - 50, 45):
        for by in range(40, h - 50, 50):
            color = np.random.choice([210, 190, 160, 120])
            cv2.rectangle(img_vqa, (bx, by), (bx + 28, by + 32), (int(color), int(color * 0.9), int(color * 0.8)), -1)

    # Save PNG
    Image.fromarray(img_vqa).save(sample_dir / "sample_vqa_optical.png")

    # Save True GeoTIFF with EPSG:4326
    geotiff_vqa_path = sample_dir / "isro_sdsc_optical.tif"
    with rasterio.open(
        geotiff_vqa_path, 'w',
        driver='GTiff',
        height=h, width=w, count=3,
        dtype=img_vqa.dtype,
        crs=crs_epsg,
        transform=geo_transform
    ) as dst:
        for b_idx in range(3):
            dst.write(img_vqa[:, :, b_idx], b_idx + 1)

    # =========================================================================
    # 2. Agricultural & Water Grounding Scene
    # =========================================================================
    img_ground = np.zeros((h, w, 3), dtype=np.uint8)
    img_ground[:] = [45, 135, 60]  # Lush agricultural green

    for px in range(0, w, 70):
        cv2.line(img_ground, (px, 0), (px, h), (120, 110, 80), 2)
    for py in range(0, h, 60):
        cv2.line(img_ground, (0, py), (w, py), (120, 110, 80), 2)

    pts = np.array([[120, 50], [210, 140], [280, 230], [260, 340], [380, 450]], np.int32)
    for i in range(len(pts) - 1):
        cv2.line(img_ground, tuple(pts[i]), tuple(pts[i+1]), (25, 95, 175), 35)
    cv2.circle(img_ground, (260, 320), 45, (25, 95, 175), -1)

    Image.fromarray(img_ground).save(sample_dir / "sample_grounding_fields.png")

    # =========================================================================
    # 3. Bi-temporal Pair (T1: 2024 vs T2: 2026)
    # =========================================================================
    img_t1 = np.zeros((h, w, 3), dtype=np.uint8)
    img_t1[:] = [60, 140, 70]
    cv2.rectangle(img_t1, (50, 50), (140, 140), (160, 150, 140), -1)
    Image.fromarray(img_t1).save(sample_dir / "sample_change_2024_t1.png")

    # True GeoTIFF for T1
    with rasterio.open(
        sample_dir / "isro_sdsc_t1_2024.tif", 'w',
        driver='GTiff',
        height=h, width=w, count=3,
        dtype=img_t1.dtype,
        crs=crs_epsg,
        transform=geo_transform
    ) as dst:
        for b_idx in range(3):
            dst.write(img_t1[:, :, b_idx], b_idx + 1)

    # T2 (2026 Expansion)
    img_t2 = img_t1.copy()
    cv2.rectangle(img_t2, (180, 160), (440, 380), (185, 185, 190), -1)  # Pad
    cv2.rectangle(img_t2, (200, 180), (320, 260), (220, 80, 60), -1)    # Facility 1
    cv2.rectangle(img_t2, (200, 280), (420, 360), (100, 140, 210), -1)  # Facility 2
    cv2.line(img_t2, (0, 270), (180, 270), (70, 70, 70), 8)             # Highway
    Image.fromarray(img_t2).save(sample_dir / "sample_change_2026_t2.png")

    # True GeoTIFF for T2
    with rasterio.open(
        sample_dir / "isro_sdsc_t2_2026.tif", 'w',
        driver='GTiff',
        height=h, width=w, count=3,
        dtype=img_t2.dtype,
        crs=crs_epsg,
        transform=geo_transform
    ) as dst:
        for b_idx in range(3):
            dst.write(img_t2[:, :, b_idx], b_idx + 1)

    # =========================================================================
    # 4. Optical + SAR Co-registered Pair
    # =========================================================================
    img_opt = img_vqa.copy()
    cloud = np.zeros((h, w, 3), dtype=np.uint8)
    cv2.circle(cloud, (320, 250), 120, (250, 250, 255), -1)
    cloud = cv2.GaussianBlur(cloud, (51, 51), 0)
    img_opt = cv2.addWeighted(img_opt, 0.70, cloud, 0.30, 0)
    Image.fromarray(img_opt).save(sample_dir / "sample_optical_cloudy.png")

    # SAR backscatter
    sar = np.random.gamma(shape=2.0, scale=35.0, size=(h, w)).astype(np.uint8)
    sar[:, :200] = np.random.gamma(shape=1.0, scale=15.0, size=(h, 200)).astype(np.uint8)
    for bx in range(240, w - 50, 45):
        for by in range(40, h - 50, 50):
            sar[by:by+32, bx:bx+28] = np.random.randint(220, 255, (32, 28))
    Image.fromarray(sar).save(sample_dir / "sample_sar_backscatter.png")

    # True SAR GeoTIFF (Single band with CRS)
    with rasterio.open(
        sample_dir / "isro_sdsc_sar.tif", 'w',
        driver='GTiff',
        height=h, width=w, count=1,
        dtype=sar.dtype,
        crs=crs_epsg,
        transform=geo_transform
    ) as dst:
        dst.write(sar, 1)

    # =========================================================================
    # 5. Dedicated ISRO SDSC Sriharikota Spaceport Benchmark (GeoTIFF)
    # =========================================================================
    img_spaceport = np.zeros((h, w, 3), dtype=np.uint8)
    # Coastal vegetation & terrain background
    img_spaceport[:] = [50, 115, 65]

    # Bay of Bengal (East coast water body: x from 450 to 512)
    img_spaceport[:, 450:] = [28, 65, 115]
    img_spaceport[:, 440:450] = [185, 175, 145]  # Sandy beach ridge

    # Buckingham Canal (West inland waterway: x from 40 to 75)
    img_spaceport[:, 40:75] = [32, 70, 105]

    # Service road and rail network
    cv2.line(img_spaceport, (60, 250), (450, 250), (90, 88, 85), 4)
    cv2.line(img_spaceport, (260, 50), (260, 480), (90, 88, 85), 4)

    # First Launch Pad (FLP) - Sriharikota (~13.733° N, 80.235° E)
    flp_center = (380, 170)
    cv2.circle(img_spaceport, flp_center, 36, (140, 140, 145), -1)  # Launch apron
    cv2.circle(img_spaceport, flp_center, 36, (60, 60, 65), 2)
    cv2.circle(img_spaceport, flp_center, 14, (45, 45, 45), -1)    # Launch pedestal
    cv2.line(img_spaceport, flp_center, (450, 170), (40, 40, 45), 8) # Flame trench
    # Lightning protection towers around FLP
    for offset in [(-30, -30), (30, -30), (0, 35)]:
        cv2.circle(img_spaceport, (flp_center[0] + offset[0], flp_center[1] + offset[1]), 4, (240, 240, 250), -1)

    # Second Launch Pad (SLP) (~13.720° N, 80.230° E)
    slp_center = (360, 340)
    cv2.circle(img_spaceport, slp_center, 40, (145, 145, 150), -1)
    cv2.circle(img_spaceport, slp_center, 40, (60, 60, 65), 2)
    cv2.circle(img_spaceport, slp_center, 16, (40, 40, 45), -1)
    cv2.line(img_spaceport, slp_center, (450, 340), (35, 35, 40), 10) # Dual flame duct

    # Vehicle Assembly Building (VAB) & Technical Complex (~13.725° N, 80.225° E)
    vab_box = (230, 140, 65, 55)
    cv2.rectangle(img_spaceport, (vab_box[0], vab_box[1]), (vab_box[0] + vab_box[2], vab_box[1] + vab_box[3]), (175, 170, 160), -1)
    cv2.rectangle(img_spaceport, (vab_box[0], vab_box[1]), (vab_box[0] + vab_box[2], vab_box[1] + vab_box[3]), (50, 50, 55), 2)
    # Rail track linking VAB to SLP
    cv2.line(img_spaceport, (vab_box[0] + 30, vab_box[1] + 55), (slp_center[0], slp_center[1]), (75, 75, 80), 3)

    # Cryogenic & Hypergolic Propellant Storage Tank Facility (~13.728° N, 80.220° E)
    tanks = [(180, 260), (205, 260), (180, 285), (205, 285)]
    cv2.rectangle(img_spaceport, (165, 245), (220, 300), (110, 105, 95), 2)  # Berm wall
    for t_pos in tanks:
        cv2.circle(img_spaceport, t_pos, 10, (220, 220, 230), -1)  # High-albedo cryogenic spheres
        cv2.circle(img_spaceport, t_pos, 10, (50, 50, 55), 1)

    # Telemetry, Tracking & Command (TTC) Radar Complex (~13.740° N, 80.220° E)
    radar_center = (180, 100)
    cv2.circle(img_spaceport, radar_center, 15, (230, 235, 245), -1)  # Radome dome
    cv2.circle(img_spaceport, radar_center, 15, (70, 70, 80), 2)
    cv2.circle(img_spaceport, (210, 100), 12, (200, 205, 215), -1)  # Secondary dish

    # Save Spaceport PNG
    Image.fromarray(img_spaceport).save(sample_dir / "sample_spaceport.png")

    # Save Spaceport GeoTIFF (EPSG:4326)
    with rasterio.open(
        sample_dir / "isro_sdsc_spaceport.tif", 'w',
        driver='GTiff',
        height=h, width=w, count=3,
        dtype=img_spaceport.dtype,
        crs=crs_epsg,
        transform=geo_transform
    ) as dst:
        for b_idx in range(3):
            dst.write(img_spaceport[:, :, b_idx], b_idx + 1)

    print("Sample satellite assets (PNG & GeoTIFF EPSG:4326) successfully materialized in storage/samples.")


if __name__ == "__main__":
    generate_sample_satellite_assets()
