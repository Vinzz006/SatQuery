from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.agent.controller import analysis_store
from app.reports.pdf_generator import generate_pdf_report
from app.config import settings

router = APIRouter(prefix="", tags=["Reports"])


@router.get("/reports/{result_id}/pdf")
async def download_pdf_report(result_id: str):
    """Generates and serves a downloadable ISRO-compliant PDF report."""
    if result_id not in analysis_store:
        raise HTTPException(status_code=404, detail="Analysis result not found.")

    analysis = analysis_store[result_id]
    pdf_path = settings.REPORTS_DIR / f"SatQuery_Report_{result_id}.pdf"

    if not pdf_path.exists():
        pdf_path = generate_pdf_report(analysis)

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=f"SatQuery_Report_{result_id}.pdf"
    )


@router.get("/reports/{result_id}/json")
async def export_json_report(result_id: str):
    """Exports structured analysis metadata and execution trace in JSON format."""
    if result_id not in analysis_store:
        raise HTTPException(status_code=404, detail="Analysis result not found.")
    return analysis_store[result_id]
