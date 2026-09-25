from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class TaskType(str, Enum):
    VQA = "vqa"
    CAPTIONING = "captioning"
    GROUNDING = "grounding"
    CHANGE_DETECTION = "change_detection"
    CHANGE_VQA = "change_vqa"
    OPTICAL_SAR_ANALYSIS = "optical_sar_analysis"
    SPECTRAL_INDEX = "spectral_index"
    BAND_COMPOSITE = "band_composite"
    GENERAL_REMOTE_SENSING_ANALYSIS = "general_remote_sensing_analysis"


class ModalityType(str, Enum):
    OPTICAL = "optical"
    SAR = "sar"
    MULTISPECTRAL = "multispectral"
    UNKNOWN = "unknown"


class ImageMetadata(BaseModel):
    id: str
    filename: str
    original_name: str
    file_path: str
    width: int
    height: int
    bands: int
    crs: Optional[str] = None
    bounds: Optional[Dict[str, float]] = None  # {minx, miny, maxx, maxy}
    resolution: Optional[List[float]] = None
    modality: ModalityType = ModalityType.OPTICAL
    file_size_bytes: int
    has_geotiff_metadata: bool = False
    preview_url: Optional[str] = None


class EvidenceArtifact(BaseModel):
    id: str
    type: str  # "change_map", "mask", "overlay", "bounding_box", "fused_composite"
    title: str
    description: str
    url: str
    properties: Dict[str, Any] = Field(default_factory=dict)


class BoundingBox(BaseModel):
    label: str
    score: float
    box_2d: List[float]  # [ymin, xmin, ymax, xmax] normalized 0-1 or pixel coords


class ExecutionTraceStep(BaseModel):
    step: int
    name: str
    status: str = "completed"  # "completed", "in_progress", "failed", "skipped"
    details: str
    timestamp: str
    duration_ms: float = 0.0


class DetectedFeature(BaseModel):
    id: str
    label: str
    score: float
    area_hectares: float
    area_km2: float
    perimeter_m: float
    centroid: List[float]  # [lat, lon]
    box_2d: List[float]  # [ymin, xmin, ymax, xmax]
    polygon_coords: Optional[List[List[float]]] = None  # [[lon, lat], ...]


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: str
    task: Optional[str] = None
    response_id: Optional[str] = None


class SessionContext(BaseModel):
    session_id: str
    created_at: str
    updated_at: str
    messages: List[ChatMessage] = Field(default_factory=list)
    image_ids: List[str] = Field(default_factory=list)
    recent_analysis_ids: List[str] = Field(default_factory=list)


class AnalyzeRequest(BaseModel):
    query: str
    image_ids: List[str]
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict)
    use_adapted_model: bool = False
    session_id: Optional[str] = None


class AnalyzeResponse(BaseModel):
    id: str
    task: TaskType
    query: str
    answer: str
    confidence: Optional[float] = None
    confidence_label: str = "Not available"
    models: List[str]
    images: List[ImageMetadata]
    evidence: List[EvidenceArtifact]
    trace: List[ExecutionTraceStep]
    statistics: Dict[str, Any] = Field(default_factory=dict)
    execution_time_ms: float
    report_url: Optional[str] = None
    geojson_url: Optional[str] = None
    session_id: Optional[str] = None
    status: str = "success"
    error: Optional[str] = None


class ModelInfo(BaseModel):
    id: str
    name: str
    capability: str
    is_adapted: bool
    status: str  # "ready", "loaded", "unavailable"
    device: str
    description: str


class EvaluationResultItem(BaseModel):
    dataset: str
    task: str
    model: str
    metric: str
    value: str
    date: str
    notes: Optional[str] = None
