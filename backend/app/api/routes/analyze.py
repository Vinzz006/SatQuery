from pathlib import Path
from typing import List
from fastapi import APIRouter, HTTPException

from app.agent.controller import agent_controller, analysis_store
from app.reports.pdf_generator import generate_pdf_report
from app.schemas.analysis import AnalyzeRequest, AnalyzeResponse
from app.config import settings

router = APIRouter(prefix="", tags=["Analysis"])


def _resolve_image_paths(image_ids: List[str]) -> List[Path]:
    resolved_paths: List[Path] = []
    for img_id in image_ids:
        # Check exact matches first
        if (settings.UPLOAD_DIR / img_id).exists():
            resolved_paths.append(settings.UPLOAD_DIR / img_id)
            continue
        if (settings.SAMPLE_DIR / img_id).exists():
            resolved_paths.append(settings.SAMPLE_DIR / img_id)
            continue

        # Check glob patterns
        candidates = list(settings.UPLOAD_DIR.glob(f"*{img_id}*"))
        if not candidates:
            candidates = list(settings.SAMPLE_DIR.glob(f"*{img_id}*"))

        # Check by matching basename without extension
        if not candidates:
            clean_id = Path(img_id).stem
            candidates = list(settings.UPLOAD_DIR.glob(f"*{clean_id}*")) + list(settings.SAMPLE_DIR.glob(f"*{clean_id}*"))

        if not candidates:
            raise HTTPException(
                status_code=404,
                detail=f"Image with identifier '{img_id}' not found. Please upload the imagery first."
            )
        resolved_paths.append(candidates[0])
    return resolved_paths


@router.post("/analyze", response_model=AnalyzeResponse)
async def universal_analyze(request: AnalyzeRequest):
    """
    Universal Agentic Analysis Endpoint.
    Automatically classifies query intent, inspects input imagery,
    routes to specialist AI models, generates evidence, and records execution trace.
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    if not request.image_ids:
        raise HTTPException(status_code=400, detail="At least one image identifier must be supplied.")

    image_paths = _resolve_image_paths(request.image_ids)

    try:
        response = agent_controller.process_query(
            query=request.query,
            image_paths=image_paths,
            use_adapted_model=request.use_adapted_model,
            parameters=request.parameters
        )

        # Proactively generate PDF report so it's instantly available for download
        generate_pdf_report(response)

        return response
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/vqa", response_model=AnalyzeResponse)
async def direct_vqa(request: AnalyzeRequest):
    """Direct invocation of Remote-Sensing VQA Specialist."""
    return await universal_analyze(request)


@router.post("/analyze/caption", response_model=AnalyzeResponse)
async def direct_caption(request: AnalyzeRequest):
    """Direct invocation of Remote-Sensing Captioning Specialist."""
    if not request.query:
        request.query = "Describe this satellite image."
    return await universal_analyze(request)


@router.post("/analyze/grounding", response_model=AnalyzeResponse)
async def direct_grounding(request: AnalyzeRequest):
    """Direct invocation of Text-Guided Grounding Specialist."""
    return await universal_analyze(request)


@router.post("/analyze/change", response_model=AnalyzeResponse)
async def direct_change(request: AnalyzeRequest):
    """Direct invocation of Bi-Temporal Change Detection Specialist."""
    if not request.query:
        request.query = "Detect changes between these two images."
    return await universal_analyze(request)


@router.post("/analyze/change-vqa", response_model=AnalyzeResponse)
async def direct_change_vqa(request: AnalyzeRequest):
    """Direct invocation of Change-grounded VQA Specialist."""
    return await universal_analyze(request)


@router.post("/analyze/optical-sar", response_model=AnalyzeResponse)
async def direct_optical_sar(request: AnalyzeRequest):
    """Direct invocation of Optical + SAR Cross-Modal Fusion Specialist."""
    if not request.query:
        request.query = "Use the optical and SAR images to identify built-up areas."
    return await universal_analyze(request)


@router.get("/results/{result_id}", response_model=AnalyzeResponse)
async def get_analysis_result(result_id: str):
    """Fetches a previously computed analysis session by ID."""
    if result_id not in analysis_store:
        raise HTTPException(status_code=404, detail=f"Analysis session '{result_id}' not found.")
    return analysis_store[result_id]
