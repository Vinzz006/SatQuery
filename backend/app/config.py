import os
from pathlib import Path
from pydantic import BaseModel
import torch

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage"
UPLOAD_DIR = STORAGE_DIR / "uploads"
ARTIFACT_DIR = STORAGE_DIR / "artifacts"
REPORTS_DIR = STORAGE_DIR / "reports"
SAMPLE_DIR = STORAGE_DIR / "samples"
CACHE_DIR = STORAGE_DIR / "model_cache"

# Ensure all persistent directories exist
for folder in [STORAGE_DIR, UPLOAD_DIR, ARTIFACT_DIR, REPORTS_DIR, SAMPLE_DIR, CACHE_DIR]:
    folder.mkdir(parents=True, exist_ok=True)


class Settings(BaseModel):
    PROJECT_NAME: str = "SatQuery AI"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True

    # Hardware Acceleration
    DEVICE_CONFIG: str = os.getenv("DEVICE", "auto")

    @property
    def DEVICE(self) -> str:
        if self.DEVICE_CONFIG.lower() == "cuda" and torch.cuda.is_available():
            return "cuda"
        elif self.DEVICE_CONFIG.lower() == "auto":
            return "cuda" if torch.cuda.is_available() else "cpu"
        return "cpu"

    # Supported formats
    ALLOWED_EXTENSIONS: set = {".tif", ".tiff", ".geotiff", ".png", ".jpg", ".jpeg"}
    MAX_FILE_SIZE_MB: int = 100

    # Paths
    BASE_DIR: Path = BASE_DIR
    UPLOAD_DIR: Path = UPLOAD_DIR
    ARTIFACT_DIR: Path = ARTIFACT_DIR
    REPORTS_DIR: Path = REPORTS_DIR
    SAMPLE_DIR: Path = SAMPLE_DIR
    CACHE_DIR: Path = CACHE_DIR

    # Model identifiers
    VQA_MODEL_ID: str = os.getenv("VQA_MODEL", "google/siglip-base-patch16-224")
    CAPTION_MODEL_ID: str = os.getenv("CAPTION_MODEL", "Salesforce/blip-image-captioning-base")
    GROUNDING_MODEL_ID: str = os.getenv("GROUNDING_MODEL", "google/owlv2-base-patch16")
    ADAPTED_MODEL_PATH: Path = BASE_DIR / "models" / "adapted_rs_head.pt"


settings = Settings()
