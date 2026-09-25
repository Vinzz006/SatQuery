from typing import List, Tuple
from app.schemas.analysis import TaskType, ModalityType


class QueryRouter:
    """
    Deterministic & semantic query router for SatQuery AI.
    Routes queries based on query intent, number of inputs, and detected sensor modalities.
    """
    @staticmethod
    def route(
        query: str,
        num_images: int,
        modalities: List[ModalityType]
    ) -> Tuple[TaskType, str, str]:
        q_lower = query.lower().strip()

        # Route single image workflows
        if num_images == 1:
            if any(w in q_lower for w in [
                "audit", "full audit", "scene intelligence", "comprehensive analysis",
                "dossier", "multi-model", "complete assessment", "full mission audit",
                "mission audit", "comprehensive remote-sensing", "comprehensive audit"
            ]):
                return (
                    TaskType.SCENE_AUDIT,
                    "scene_audit",
                    "Single image inquiry with comprehensive multi-specialist audit intent -> Routed to Multi-Model Scene Intelligence Chain of Thought."
                )

            elif any(w in q_lower for w in [
                "false color", "false-color", "color infrared", "cir", "color-infrared",
                "band composite", "infrared composite", "agriculture composite", "moisture composite",
                "render cir", "show cir"
            ]):
                return (
                    TaskType.BAND_COMPOSITE,
                    "composite",
                    "Single image inquiry with multi-spectral band composite synthesis intent -> Routed to Multi-Spectral Composite Specialist (CIR/Agriculture)."
                )

            elif any(w in q_lower for w in [
                "ndvi", "ndwi", "ndbi", "vegetation index", "water index", "built-up index",
                "spectral index", "biomass index", "canopy health", "spectral heatmap",
                "compute ndvi", "compute ndwi", "compute ndbi", "surface water index"
            ]):
                return (
                    TaskType.SPECTRAL_INDEX,
                    "spectral",
                    "Single image inquiry with spectral / radiometric index mapping intent -> Routed to Spectral Index Specialist (NDVI/NDWI/NDBI)."
                )

            elif any(w in q_lower for w in [
                "highlight", "where is", "where are", "locate", "find", "bounding box",
                "mask", "segment", "show me the", "identify", "detect", "delineate",
                "outline", "demarcate", "compute area", "compute the area", "measure area",
                "measure the area", "calculate area", "launch pad", "launch complex"
            ]):
                return (
                    TaskType.GROUNDING,
                    "grounding",
                    "Single image detected with spatial referring/localization/grounding intent -> Routed to Text-Guided Grounding Specialist."
                )

            elif any(w in q_lower for w in ["describe", "caption", "overview", "what does this show", "scene description", "tell me about"]):
                return (
                    TaskType.CAPTIONING,
                    "captioning",
                    "Single image detected with holistic scene description intent -> Routed to Remote-Sensing Captioning Specialist."
                )

            else:
                return (
                    TaskType.VQA,
                    "vqa",
                    "Single image detected with targeted feature inquiry -> Routed to Remote-Sensing VQA Specialist."
                )

        # Route multi-image workflows (pair analysis)
        elif num_images == 2:
            has_optical = any(m in [ModalityType.OPTICAL, ModalityType.MULTISPECTRAL] for m in modalities)
            has_sar = any(m == ModalityType.SAR for m in modalities)
            sar_keywords = any(w in q_lower for w in ["sar", "radar", "optical and sar", "fuse", "fusion", "cross-modal", "backscatter", "both images"])

            if (has_optical and has_sar) or sar_keywords:
                return (
                    TaskType.OPTICAL_SAR_ANALYSIS,
                    "optical_sar",
                    "Dual-sensor pair (Optical + SAR) detected -> Routed to Cross-Modal Feature Fusion Specialist."
                )

            # Bi-temporal change detection & change-VQA
            change_keywords = any(w in q_lower for w in [
                "change", "changed", "difference", "between", "expansion", "increase",
                "decrease", "loss", "growth", "new construction", "before and after", "evolution"
            ])

            if change_keywords or "?" in query or any(q_lower.startswith(w) for w in ["what", "has", "did", "is", "where"]):
                if any(w in q_lower for w in ["what changed", "has", "did", "where", "how much", "increased", "decreased"]):
                    return (
                        TaskType.CHANGE_VQA,
                        "change_vqa",
                        "Bi-temporal pair with specific analytical change query -> Routed to Change-grounded VQA Specialist."
                    )
                else:
                    return (
                        TaskType.CHANGE_DETECTION,
                        "change_detection",
                        "Bi-temporal pair with change mapping intent -> Routed to Bi-Temporal Change Detection Specialist."
                    )
            else:
                return (
                    TaskType.CHANGE_VQA,
                    "change_vqa",
                    "Dual-image pair detected -> Defaulted to Change-grounded VQA Specialist."
                )

        else:
            raise ValueError(f"SatQuery AI currently expects 1 or 2 images, but received {num_images}.")
