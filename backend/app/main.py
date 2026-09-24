from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.api.routes import upload, analyze, models, reports, evaluation

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Interactive Vision-Language Assistant for Multimodal Remote Sensing Image Analysis (ISRO PS 26167)"
)

# Enable CORS for local and networked frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static file directories for generated artifacts, previews, and reports
app.mount("/api/v1/artifacts", StaticFiles(directory=str(settings.ARTIFACT_DIR)), name="artifacts")
app.mount("/api/v1/uploads", StaticFiles(directory=str(settings.UPLOAD_DIR)), name="uploads")
app.mount("/api/v1/samples", StaticFiles(directory=str(settings.SAMPLE_DIR)), name="samples")
app.mount("/api/v1/report-files", StaticFiles(directory=str(settings.REPORTS_DIR)), name="report-files")

# Register API routers under /api/v1
api_prefix = settings.API_V1_STR
app.include_router(upload.router, prefix=api_prefix)
app.include_router(analyze.router, prefix=api_prefix)
app.include_router(models.router, prefix=api_prefix)
app.include_router(reports.router, prefix=api_prefix)
app.include_router(evaluation.router, prefix=api_prefix)


@app.get(f"{api_prefix}/health", tags=["Health"])
async def health_check():
    """Health check endpoint exposing runtime version, hardware acceleration, and system status."""
    return {
        "status": "online",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "device": settings.DEVICE,
        "isro_problem_statement": "26167"
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "SatQuery AI Backend is active and operational.",
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR
    }
