from typing import Dict, Any, List
from app.models.base import BaseSpecialistModel
from app.models.vqa import RemoteSensingVQASpecialist
from app.models.captioning import RemoteSensingCaptioningSpecialist
from app.models.grounding import TextGuidedGroundingSpecialist
from app.models.change_detection import BiTemporalChangeDetectionSpecialist
from app.models.change_vqa import ChangeVQASpecialist
from app.models.optical_sar import OpticalSARFusionSpecialist
from app.models.spectral import SpectralIndexSpecialist
from app.models.composite import MultiSpectralCompositeSpecialist
from app.schemas.analysis import ModelInfo


class ModelRegistry:
    """
    Central Registry for all SatQuery AI Remote Sensing Specialist Models.
    Supports dynamic lookup, lazy-load discovery, and hardware capability inspection.
    """
    def __init__(self):
        self._models: Dict[str, BaseSpecialistModel] = {}
        self._init_specialists()

    def _init_specialists(self):
        # Initialize instances in standby mode (lazy loading on demand)
        self.vqa = RemoteSensingVQASpecialist()
        self.captioning = RemoteSensingCaptioningSpecialist()
        self.grounding = TextGuidedGroundingSpecialist()
        self.change_detector = BiTemporalChangeDetectionSpecialist()
        self.change_vqa = ChangeVQASpecialist(self.change_detector)
        self.optical_sar = OpticalSARFusionSpecialist()
        self.spectral = SpectralIndexSpecialist()
        self.composite = MultiSpectralCompositeSpecialist()

        self._models = {
            "vqa": self.vqa,
            "captioning": self.captioning,
            "grounding": self.grounding,
            "change_detection": self.change_detector,
            "change_vqa": self.change_vqa,
            "optical_sar": self.optical_sar,
            "spectral": self.spectral,
            "composite": self.composite
        }

    def get(self, key: str) -> BaseSpecialistModel:
        if key not in self._models:
            raise KeyError(f"Specialist model '{key}' is not registered in ModelRegistry.")
        return self._models[key]

    def list_models(self) -> List[ModelInfo]:
        info_list = []
        for key, model in self._models.items():
            status = model.get_status()
            info_list.append(ModelInfo(
                id=key,
                name=status["model_id"],
                capability=status["capability"],
                is_adapted=(key == "vqa"),
                status="ready" if status["is_loaded"] else "standby",
                device=status["device"],
                description=f"Specialist module dedicated to {status['capability'].replace('_', ' ')}."
            ))
        return info_list


registry = ModelRegistry()
