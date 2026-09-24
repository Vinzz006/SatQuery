from typing import List
from fastapi import APIRouter
from app.evaluation.benchmarks import get_all_benchmark_results
from app.schemas.analysis import EvaluationResultItem

router = APIRouter(prefix="", tags=["Evaluation & Benchmarks"])


@router.get("/evaluation", response_model=List[EvaluationResultItem])
async def list_evaluations():
    """Returns official remote sensing benchmark evaluations for RSVQA, CDVQA, and VRSBench."""
    return get_all_benchmark_results()
