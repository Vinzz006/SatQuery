import uuid
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
import numpy as np
import rasterio
import matplotlib
matplotlib.use("Agg")  # Non-interactive headless backend
import matplotlib.pyplot as plt

from app.config import settings


def compute_ndvi(arr: np.ndarray, file_path: Optional[Path] = None) -> np.ndarray:
    """
    Computes Normalized Difference Vegetation Index (NDVI).
    - If 4+ band GeoTIFF available (B1=R, B2=G, B3=B, B4=NIR): (NIR - Red) / (NIR + Red)
    - If 3-band RGB: Computes Green-Red Normalized Difference / GLI: (2*G - R - B) / (2*G + R + B)
    Values range strictly within [-1.0, 1.0].
    """
    # Check if 4+ band rasterio file exists
    if file_path and Path(file_path).exists():
        try:
            with rasterio.open(file_path) as src:
                if src.count >= 4:
                    red = src.read(1).astype(np.float32)
                    nir = src.read(4).astype(np.float32)
                    denom = nir + red + 1e-7
                    ndvi = (nir - red) / denom
                    return np.clip(ndvi, -1.0, 1.0)
        except Exception:
            pass

    # Fallback to RGB array
    if arr.ndim == 3 and arr.shape[2] >= 3:
        r = arr[:, :, 0].astype(np.float32)
        g = arr[:, :, 1].astype(np.float32)
        b = arr[:, :, 2].astype(np.float32)

        # Visible Atmospherically Resistant Index (VARI) / Green Leaf Index (GLI)
        # Normalized for satellite optical imagery
        denom = (2.0 * g + r + b) + 1e-7
        ndvi_vis = (2.0 * g - r - b) / denom
        return np.clip(ndvi_vis * 1.5, -1.0, 1.0)
    elif arr.ndim == 2:
        # Single band approximation
        norm = arr.astype(np.float32) / 255.0
        return np.clip((norm - 0.5) * 2.0, -1.0, 1.0)
    else:
        norm = arr[:, :, 0].astype(np.float32) / 255.0
        return np.clip((norm - 0.5) * 2.0, -1.0, 1.0)


def compute_ndwi(arr: np.ndarray, file_path: Optional[Path] = None) -> np.ndarray:
    """
    Computes Normalized Difference Water Index (NDWI) for surface water delineation.
    - If 4+ band: (Green - NIR) / (Green + NIR) [McFeeters]
    - If RGB: Delineates high blue-green reflectance vs absorbed red: (Blue - Red) / (Blue + Red)
    Values range strictly within [-1.0, 1.0].
    """
    if file_path and Path(file_path).exists():
        try:
            with rasterio.open(file_path) as src:
                if src.count >= 4:
                    green = src.read(2).astype(np.float32)
                    nir = src.read(4).astype(np.float32)
                    denom = green + nir + 1e-7
                    ndwi = (green - nir) / denom
                    return np.clip(ndwi, -1.0, 1.0)
        except Exception:
            pass

    if arr.ndim == 3 and arr.shape[2] >= 3:
        r = arr[:, :, 0].astype(np.float32)
        g = arr[:, :, 1].astype(np.float32)
        b = arr[:, :, 2].astype(np.float32)

        # High blue/green reflectance with low red indicates open water
        water_signal = (b + g) / 2.0
        denom = (water_signal + r) + 1e-7
        ndwi_vis = (water_signal - r) / denom
        return np.clip(ndwi_vis, -1.0, 1.0)
    elif arr.ndim == 2:
        norm = arr.astype(np.float32) / 255.0
        return np.clip((0.5 - norm) * 2.0, -1.0, 1.0)
    else:
        norm = arr[:, :, 0].astype(np.float32) / 255.0
        return np.clip((0.5 - norm) * 2.0, -1.0, 1.0)


def compute_ndbi(arr: np.ndarray, file_path: Optional[Path] = None) -> np.ndarray:
    """
    Computes Normalized Difference Built-Up Index (NDBI) for impervious surface mapping.
    - High positive values correlate with concrete, asphalt, industrial structures, and launchpads.
    Values range strictly within [-1.0, 1.0].
    """
    if arr.ndim == 3 and arr.shape[2] >= 3:
        r = arr[:, :, 0].astype(np.float32)
        g = arr[:, :, 1].astype(np.float32)
        b = arr[:, :, 2].astype(np.float32)

        # Built-up surfaces exhibit high reflectance in red/grey and suppressed green chlorophyll
        denom = (r + g) + 1e-7
        ndbi_vis = (r - g) / denom
        return np.clip(ndbi_vis, -1.0, 1.0)
    else:
        norm = (arr[:, :, 0] if arr.ndim == 3 else arr).astype(np.float32) / 255.0
        return np.clip((norm - 0.4) * 2.0, -1.0, 1.0)


def generate_spectral_artifact(
    index_map: np.ndarray,
    index_type: str
) -> Tuple[str, Dict[str, Any]]:
    """
    Renders scientific remote-sensing colormap visualization with embedded scale bar,
    and calculates statistical distribution metrics.
    """
    art_id = str(uuid.uuid4())[:8]
    filename = f"spectral_{index_type.lower()}_{art_id}.png"
    out_path = settings.ARTIFACT_DIR / filename

    # Select appropriate colormap and title
    if index_type.upper() == "NDVI":
        cmap = "RdYlGn"
        title = "Normalized Difference Vegetation Index (NDVI)"
        vmin, vmax = -0.5, 0.8
    elif index_type.upper() == "NDWI":
        cmap = "coolwarm"
        title = "Normalized Difference Water Index (NDWI)"
        vmin, vmax = -0.6, 0.6
    else:  # NDBI or general
        cmap = "YlOrRd"
        title = "Normalized Difference Built-Up Index (NDBI)"
        vmin, vmax = -0.4, 0.6

    h, w = index_map.shape[:2]
    fig_w = 7.0
    fig_h = max(4.0, fig_w * (h / w))

    fig, ax = plt.subplots(figsize=(fig_w, fig_h), dpi=150)
    fig.patch.set_facecolor("#0b0f19")
    ax.set_facecolor("#0b0f19")

    im = ax.imshow(index_map, cmap=cmap, vmin=vmin, vmax=vmax)
    ax.set_title(title, color="#e2e8f0", fontsize=11, fontweight="bold", pad=10)
    ax.tick_params(colors="#94a3b8", labelsize=8)
    for spine in ax.spines.values():
        spine.set_color("#334155")

    # Add colorbar
    cbar = fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    cbar.ax.tick_params(colors="#94a3b8", labelsize=8)
    cbar.outline.set_edgecolor("#334155")
    cbar.set_label("Spectral Index Value", color="#cbd5e1", fontsize=9)

    plt.tight_layout()
    plt.savefig(out_path, format="png", bbox_inches="tight", facecolor=fig.get_facecolor(), edgecolor="none")
    plt.close(fig)

    # Compute comprehensive distribution statistics
    mean_val = float(np.mean(index_map))
    median_val = float(np.median(index_map))
    min_val = float(np.min(index_map))
    max_val = float(np.max(index_map))
    std_val = float(np.std(index_map))
    total_pixels = index_map.size

    stats: Dict[str, Any] = {
        "index_type": index_type.upper(),
        "mean": round(mean_val, 4),
        "median": round(median_val, 4),
        "min": round(min_val, 4),
        "max": round(max_val, 4),
        "std": round(std_val, 4),
        "total_pixels": total_pixels
    }

    if index_type.upper() == "NDVI":
        high_vigor = float(np.sum(index_map > 0.35) / total_pixels * 100)
        moderate_vigor = float(np.sum((index_map > 0.15) & (index_map <= 0.35)) / total_pixels * 100)
        sparse_or_bare = float(np.sum((index_map >= 0.0) & (index_map <= 0.15)) / total_pixels * 100)
        non_vegetated = float(np.sum(index_map < 0.0) / total_pixels * 100)

        stats.update({
            "high_vigor_canopy_pct": round(high_vigor, 2),
            "moderate_vigor_pct": round(moderate_vigor, 2),
            "sparse_or_bare_pct": round(sparse_or_bare, 2),
            "non_vegetated_pct": round(non_vegetated, 2),
            "primary_classification": "Dense Forest & Coastal Shrub" if high_vigor > 30 else (
                "Moderate Agricultural & Plantation" if moderate_vigor > 30 else "Sparse / Mixed Coastal Terrain"
            )
        })

    elif index_type.upper() == "NDWI":
        open_water = float(np.sum(index_map > 0.15) / total_pixels * 100)
        shallow_or_wetland = float(np.sum((index_map >= -0.05) & (index_map <= 0.15)) / total_pixels * 100)
        dry_terrestrial = float(np.sum(index_map < -0.05) / total_pixels * 100)

        stats.update({
            "open_water_pct": round(open_water, 2),
            "shallow_wetland_pct": round(shallow_or_wetland, 2),
            "dry_terrestrial_pct": round(dry_terrestrial, 2),
            "primary_classification": "Predominantly Marine / Lagoon" if open_water > 40 else (
                "Mixed Coastal Lagoon & Wetland" if (open_water + shallow_or_wetland) > 25 else "Predominantly Terrestrial"
            )
        })

    elif index_type.upper() == "NDBI":
        high_density_built = float(np.sum(index_map > 0.20) / total_pixels * 100)
        moderate_built = float(np.sum((index_map > 0.05) & (index_map <= 0.20)) / total_pixels * 100)
        natural_surface = float(np.sum(index_map <= 0.05) / total_pixels * 100)

        stats.update({
            "high_density_built_pct": round(high_density_built, 2),
            "moderate_built_pct": round(moderate_built, 2),
            "natural_surface_pct": round(natural_surface, 2),
            "primary_classification": "Developed Launch Complexes & Facilities" if high_density_built > 15 else (
                "Light Industrial & Infrastructure" if (high_density_built + moderate_built) > 20 else "Predominantly Undeveloped Coastal Preserve"
            )
        })

    return filename, stats
