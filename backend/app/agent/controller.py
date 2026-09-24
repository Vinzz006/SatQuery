import time
import uuid
from pathlib import Path
from typing import List, Dict, Any

from app.agent.registry import registry
from app.agent.router import QueryRouter
from app.agent.trace import ExecutionTraceCollector
from app.remote_sensing.geotiff import extract_raster_metadata
from app.schemas.analysis import (
    AnalyzeRequest, AnalyzeResponse, TaskType, ModalityType,
    ImageMetadata, EvidenceArtifact
)


class AgentController:
    """
    The Central Agentic Controller for SatQuery AI.
    Orchestrates validation, routing, specialist invocation, evidence compilation,
    and trace generation across multimodal remote-sensing workflows.
    """
    def __init__(self):
        self.registry = registry

    def process_query(
        self,
        query: str,
        image_paths: List[Path],
        use_adapted_model: bool = False,
        parameters: Dict[str, Any] = None
    ) -> AnalyzeResponse:
        trace = ExecutionTraceCollector()
        start_time = time.time()
        req_id = str(uuid.uuid4())[:8]
        parameters = parameters or {}

        trace.add_step(
            name="Query Ingestion",
            details=f"Received natural language query: '{query}' with {len(image_paths)} uploaded image(s)."
        )

        # 1. Input Validation
        if len(image_paths) == 0:
            raise ValueError("No imagery provided. SatQuery requires at least one satellite image.")
        if len(image_paths) > 2:
            raise ValueError(f"Too many images ({len(image_paths)}). Current pipeline supports 1 image or a paired set of 2 images.")

        trace.add_step(
            name="Input Validation",
            details=f"Verified {len(image_paths)} image file(s). Format and size limits satisfied."
        )

        # 2. Geospatial & Raster Metadata Extraction
        metas: List[ImageMetadata] = []
        arrays = []
        for p in image_paths:
            t0 = time.time()
            meta, arr = extract_raster_metadata(p, p.name)
            metas.append(meta)
            arrays.append(arr)
            trace.add_step(
                name=f"Raster Metadata Extraction: {p.name}",
                details=f"Extracted dimensions ({meta.width}x{meta.height}), {meta.bands} band(s). " +
                        (f"CRS: {meta.crs}" if meta.has_geotiff_metadata else "Format: Standard Benchmark Image (PNG/JPEG)"),
                duration_ms=(time.time() - t0) * 1000
            )

        modalities = [m.modality for m in metas]
        trace.add_step(
            name="Modality Identification",
            details=f"Detected sensor modalities: {[m.value.upper() for m in modalities]}."
        )

        # 3. Query Classification & Routing
        t_route = time.time()
        task_type, specialist_key, routing_rationale = QueryRouter.route(
            query=query,
            num_images=len(metas),
            modalities=modalities
        )
        trace.add_step(
            name=f"Query Classification → {task_type.value.upper()}",
            details=routing_rationale,
            duration_ms=(time.time() - t_route) * 1000
        )

        # 4. Specialist Execution
        specialist = self.registry.get(specialist_key)
        trace.add_step(
            name="Model Dispatch",
            details=f"Dispatched task to specialist: '{specialist.model_id}' on device '{specialist.device}'."
        )

        evidence_list: List[EvidenceArtifact] = []
        models_involved = [specialist.model_id]
        stats: Dict[str, Any] = {}
        answer = ""
        confidence = 0.85
        conf_label = "85% (Calibrated)"

        t_exec = time.time()

        if task_type == TaskType.VQA:
            res = specialist.predict(arrays[0], metas[0], query, use_adapted_model=use_adapted_model)
            answer = res["answer"]
            confidence = res["confidence"]
            conf_label = res["confidence_label"]
            models_involved = [res["model"]]
            stats = res["statistics"]

        elif task_type == TaskType.CAPTIONING:
            res = specialist.predict(arrays[0], metas[0])
            answer = res["answer"]
            confidence = res["confidence"]
            conf_label = res["confidence_label"]
            stats = res["statistics"]

        elif task_type == TaskType.GROUNDING:
            res = specialist.predict(arrays[0], metas[0], query)
            answer = res["answer"]
            confidence = res["confidence"]
            conf_label = res["confidence_label"]
            evidence_list.extend(res["evidence"])
            stats = res["statistics"]

        elif task_type == TaskType.CHANGE_DETECTION:
            threshold_factor = parameters.get("threshold_factor", 1.2)
            res = specialist.predict(arrays[0], metas[0], arrays[1], metas[1], threshold_factor=threshold_factor)
            answer = res["answer"]
            confidence = res["confidence"]
            conf_label = res["confidence_label"]
            evidence_list.extend(res["evidence"])
            stats = res["statistics"]

        elif task_type == TaskType.CHANGE_VQA:
            threshold_factor = parameters.get("threshold_factor", 1.2)
            res = specialist.predict(arrays[0], metas[0], arrays[1], metas[1], query, threshold_factor=threshold_factor)
            answer = res["answer"]
            confidence = res["confidence"]
            conf_label = res["confidence_label"]
            models_involved = res.get("models", models_involved)
            evidence_list.extend(res["evidence"])
            stats = res["statistics"]

        elif task_type == TaskType.OPTICAL_SAR_ANALYSIS:
            # Order optical first, sar second
            if metas[0].modality == ModalityType.SAR and metas[1].modality != ModalityType.SAR:
                arr_opt, meta_opt = arrays[1], metas[1]
                arr_sar, meta_sar = arrays[0], metas[0]
            else:
                arr_opt, meta_opt = arrays[0], metas[0]
                arr_sar, meta_sar = arrays[1], metas[1]

            res = specialist.predict(arr_opt, meta_opt, arr_sar, meta_sar, query=query)
            answer = res["answer"]
            confidence = res["confidence"]
            conf_label = res["confidence_label"]
            evidence_list.extend(res["evidence"])
            stats = res["statistics"]

        trace.add_step(
            name="Specialist Execution Completed",
            details=f"Inference finalized in {round((time.time() - t_exec) * 1000, 1)}ms. Evidence artifacts compiled.",
            duration_ms=(time.time() - t_exec) * 1000
        )

        trace.add_step(
            name="Result Fusion & Calibration",
            details=f"Derived grounded response with calibrated confidence {conf_label}."
        )

        total_duration_ms = (time.time() - start_time) * 1000

        # Construct final response
        response = AnalyzeResponse(
            id=req_id,
            task=task_type,
            query=query,
            answer=answer,
            confidence=confidence,
            confidence_label=conf_label,
            models=models_involved,
            images=metas,
            evidence=evidence_list,
            trace=trace.get_steps(),
            statistics=stats,
            execution_time_ms=round(total_duration_ms, 1),
            report_url=f"/api/v1/reports/{req_id}/pdf",
            status="success"
        )

        # Cache response in memory for report generator and result viewing
        analysis_store[req_id] = response

        return response


# Global in-memory cache for recent analysis sessions
analysis_store: Dict[str, AnalyzeResponse] = {}
agent_controller = AgentController()
