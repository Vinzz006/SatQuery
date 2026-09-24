from typing import List
from fastapi import APIRouter
from app.agent.registry import registry
from app.schemas.analysis import ModelInfo

router = APIRouter(prefix="", tags=["Model Registry"])


@router.get("/models", response_model=List[ModelInfo])
async def list_models():
    """Returns metadata and health status for all registered specialist models."""
    return registry.list_models()
