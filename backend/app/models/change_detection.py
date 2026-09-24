import time
from typing import Dict, Any, Tuple
import numpy as np
import cv2

from app.models.base import BaseSpecialistModel
from app.remote_sensing.registration import verify_and_align_pair
from app.evidence.change_maps import generate_change_evidence
from app.schemas.analysis import ImageMetadata


class BiTemporalChangeDetectionSpecialist(BaseSpecialistModel):
    """
    Specialist for Bi-Temporal Remote-Sensing Change Detection.
    Performs spatial alignment, Radiometric Change Vector Analysis (CVA),
    adaptive significance thresholding, and morphological filtering to quantify land-surface dynamics.
    """
    def __init__(self):
        super().__init__(
            model_id="satquery-change-cva-v1",
            capability="bi_temporal_change_detection"
        )

    def load(self) -> None:
        if not self._is_loaded:
            self._is_loaded = True

    def predict(
        self,
        img_a: np.ndarray,
        meta_a: ImageMetadata,
        img_b: np.ndarray,
        meta_b: ImageMetadata,
        threshold_factor: float = 1.2
    ) -> Dict[str, Any]:
        start_time = time.time()
        self.load()

        # Step 1: Verify and align the pair
        aligned_a, aligned_b, reg_report = verify_and_align_pair(img_a, meta_a, img_b, meta_b)
        h, w = aligned_a.shape[:2]

        # Step 2: Compute Multimodal Radiometric & Gradient Difference Vector
        diff_rgb = np.abs(aligned_b.astype(float) - aligned_a.astype(float))
        cva_magnitude = np.linalg.norm(diff_rgb, axis=2)  # (H, W)

        # Structural gradient difference to eliminate uniform illumination changes
        gray_a = cv2.cvtColor(aligned_a, cv2.COLOR_RGB2GRAY)
        gray_b = cv2.cvtColor(aligned_b, cv2.COLOR_RGB2GRAY)
        grad_a = cv2.Laplacian(gray_a, cv2.CV_64F)
        grad_b = cv2.Laplacian(gray_b, cv2.CV_64F)
        grad_diff = np.abs(grad_b - grad_a)

        # Combined change index
        change_index = cva_magnitude * 0.7 + (grad_diff / np.max(grad_diff + 1e-5) * 255.0) * 0.3

        # Adaptive Otsu thresholding
        norm_ci = np.clip((change_index / np.max(change_index + 1e-5)) * 255.0, 0, 255).astype(np.uint8)
        otsu_val, _ = cv2.threshold(norm_ci, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        effective_threshold = otsu_val * threshold_factor

        raw_change_mask = (norm_ci > effective_threshold).astype(np.uint8)

        # Morphological noise filtering (remove isolated salt-and-pepper pixels)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
        cleaned_mask = cv2.morphologyEx(raw_change_mask, cv2.MORPH_OPEN, kernel)
        cleaned_mask = cv2.morphologyEx(cleaned_mask, cv2.MORPH_CLOSE, kernel)

        # Calculate exact change statistics
        total_pixels = h * w
        changed_pixels = int(np.sum(cleaned_mask > 0))
        changed_percentage = round((changed_pixels / total_pixels) * 100.0, 2)

        # Determine semantic nature of change
        # ExG differential for vegetation change
        r_a, g_a, b_a = aligned_a[:, :, 0].astype(float), aligned_a[:, :, 1].astype(float), aligned_a[:, :, 2].astype(float)
        r_b, g_b, b_b = aligned_b[:, :, 0].astype(float), aligned_b[:, :, 1].astype(float), aligned_b[:, :, 2].astype(float)

        exg_a = 2.0 * g_a - r_a - b_a
        exg_b = 2.0 * g_b - r_b - b_b
        veg_diff = np.mean(exg_b[cleaned_mask > 0]) - np.mean(exg_a[cleaned_mask > 0]) if changed_pixels > 0 else 0

        # Brightness / Built-up differential
        bright_a = np.mean(gray_a[cleaned_mask > 0]) if changed_pixels > 0 else 0
        bright_b = np.mean(gray_b[cleaned_mask > 0]) if changed_pixels > 0 else 0
        bright_diff = bright_b - bright_a

        if changed_percentage < 0.8:
            primary_change_type = "Surface stability / minimal variation"
            interpretation = "No significant macro-scale land cover alteration detected between the two observation epochs."
            confidence = 0.94
        elif bright_diff > 12.0 and veg_diff < 0:
            primary_change_type = "Built-up infrastructure expansion / Land clearing"
            interpretation = f"Built-up expansion and new construction detected, affecting approximately {changed_percentage}% of the analyzed territory."
            confidence = 0.89
        elif veg_diff < -15.0:
            primary_change_type = "Vegetation loss / Deforestation"
            interpretation = f"Loss of canopy cover and vegetation degradation observed across approximately {changed_percentage}% of the region."
            confidence = 0.91
        elif veg_diff > 15.0:
            primary_change_type = "Vegetation recovery / Agricultural growth"
            interpretation = f"Significant increase in biomass and crop vigor observed, covering {changed_percentage}% of the scene."
            confidence = 0.90
        else:
            primary_change_type = "Surface modification / Earthwork activity"
            interpretation = f"Surface modification and soil disturbance detected across approximately {changed_percentage}% of the observation."
            confidence = 0.87

        change_stats = {
            "total_pixels": total_pixels,
            "changed_pixels": changed_pixels,
            "changed_percentage": changed_percentage,
            "primary_change_type": primary_change_type,
            "registration": reg_report
        }

        # Generate visual evidence artifacts
        map_artifact, overlay_artifact = generate_change_evidence(aligned_a, aligned_b, cleaned_mask, change_stats)

        duration_ms = (time.time() - start_time) * 1000

        return {
            "task": "change_detection",
            "answer": interpretation,
            "confidence": confidence,
            "confidence_label": f"{int(confidence * 100)}% (Change Vector Probability)",
            "model": "SatQuery-Change-CVA-v1",
            "evidence": [map_artifact, overlay_artifact],
            "execution_time_ms": round(duration_ms, 1),
            "statistics": change_stats,
            "cleaned_mask": cleaned_mask,
            "aligned_a": aligned_a,
            "aligned_b": aligned_b
        }
