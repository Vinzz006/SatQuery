import shutil
import uuid
from pathlib import Path
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.config import settings
from app.remote_sensing.geotiff import extract_raster_metadata
from app.schemas.analysis import ImageMetadata

router = APIRouter(prefix="", tags=["Upload & Samples"])


@router.post("/upload", response_model=List[ImageMetadata])
async def upload_images(files: List[UploadFile] = File(...)):
    """
    Accepts GeoTIFF, TIFF, PNG, or JPEG remote sensing imagery.
    Validates file formats, extracts geospatial/radiometric metadata,
    and returns rich ImageMetadata objects with web previews.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")
    if len(files) > 2:
        raise HTTPException(status_code=400, detail="Maximum 2 images allowed per analysis session.")

    results: List[ImageMetadata] = []

    for file in files:
        ext = Path(file.filename).suffix.lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{ext}'. Please upload GeoTIFF (.tif/.tiff) or standard benchmark imagery (.png/.jpg)."
            )

        unique_id = str(uuid.uuid4())[:8]
        dest_filename = f"{unique_id}_{file.filename}"
        dest_path = settings.UPLOAD_DIR / dest_filename

        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Extract metadata
        meta, _ = extract_raster_metadata(dest_path, file.filename)
        results.append(meta)

    return results


@router.get("/samples", response_model=List[ImageMetadata])
async def list_sample_imagery():
    """
    Returns pre-bundled high-fidelity satellite scenes configured for all 5 demo scenarios:
    1. Single Optical Scene (VQA & Captioning)
    2. Agricultural & Water scene (Grounding)
    3. Bi-Temporal T1 (Pre-Expansion)
    4. Bi-Temporal T2 (Post-Expansion)
    5. Optical + SAR Co-registered Pair
    """
    sample_dir = settings.SAMPLE_DIR
    sample_files = [
        ("sample_vqa_optical.png", "Urban Harbor Optical Scene"),
        ("sample_grounding_fields.png", "Agricultural River Basin"),
        ("sample_change_2024_t1.png", "Pre-Expansion Epoch (2024)"),
        ("sample_change_2026_t2.png", "Post-Expansion Epoch (2026)"),
        ("sample_optical_cloudy.png", "Hazy Optical Scene (Harbor)"),
        ("sample_sar_backscatter.png", "Sentinel-1 SAR Backscatter")
    ]

    samples: List[ImageMetadata] = []
    for fn, label in sample_files:
        p = sample_dir / fn
        if p.exists():
            meta, _ = extract_raster_metadata(p, label)
            samples.append(meta)

    return samples
