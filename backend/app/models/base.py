from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import torch

from app.config import settings


class BaseSpecialistModel(ABC):
    """
    Abstract Base Class for all SatQuery AI Remote Sensing Specialists.
    Implements lazy loading, device awareness, and standardized prediction output.
    """
    def __init__(self, model_id: str, capability: str):
        self.model_id = model_id
        self.capability = capability
        self.device = settings.DEVICE
        self._is_loaded = False
        self._model = None
        self._processor = None

    @property
    def is_loaded(self) -> bool:
        return self._is_loaded

    def get_status(self) -> Dict[str, Any]:
        return {
            "model_id": self.model_id,
            "capability": self.capability,
            "is_loaded": self._is_loaded,
            "device": self.device,
            "status": "ready" if self._is_loaded else "standby"
        }

    @abstractmethod
    def load(self) -> None:
        """Loads model weights lazily into memory/device."""
        pass

    @abstractmethod
    def predict(self, *args, **kwargs) -> Dict[str, Any]:
        """Executes inference and returns structured dictionary."""
        pass
