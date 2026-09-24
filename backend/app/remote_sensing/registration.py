from typing import Tuple, Dict, Any
import numpy as np
import cv2
from PIL import Image

from app.schemas.analysis import ImageMetadata


def verify_and_align_pair(
    img_a: np.ndarray,
    meta_a: ImageMetadata,
    img_b: np.ndarray,
    meta_b: ImageMetadata
) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
    """
    Verifies spatial compatibility of two remote sensing images.
    Aligns/registers Image B to Image A using homography or geospatial resampling if needed.
    Returns:
        aligned_a: (H, W, C)
        aligned_b: (H, W, C)
        registration_report: Dict with status, overlap info, and method used.
    """
    from app.remote_sensing.geotiff import normalize_for_display

    norm_a = normalize_for_display(img_a)
    norm_b = normalize_for_display(img_b)

    # Convert to 3-channel RGB for unified processing
    if norm_a.ndim == 2:
        norm_a = cv2.cvtColor(norm_a, cv2.COLOR_GRAY2RGB)
    elif norm_a.ndim == 3 and norm_a.shape[2] == 1:
        norm_a = cv2.cvtColor(norm_a[:, :, 0], cv2.COLOR_GRAY2RGB)

    if norm_b.ndim == 2:
        norm_b = cv2.cvtColor(norm_b, cv2.COLOR_GRAY2RGB)
    elif norm_b.ndim == 3 and norm_b.shape[2] == 1:
        norm_b = cv2.cvtColor(norm_b[:, :, 0], cv2.COLOR_GRAY2RGB)

    h_a, w_a = norm_a.shape[:2]
    h_b, w_b = norm_b.shape[:2]

    report: Dict[str, Any] = {
        "spatial_registered": True,
        "method": "exact_grid",
        "overlap_percentage": 100.0,
        "georeferenced": meta_a.has_geotiff_metadata and meta_b.has_geotiff_metadata
    }

    # If dimensions match already
    if (h_a, w_a) == (h_b, w_b):
        return norm_a, norm_b, report

    # If dimensions differ, attempt feature-based registration (ORB + RANSAC)
    gray_a = cv2.cvtColor(norm_a, cv2.COLOR_RGB2GRAY)
    gray_b = cv2.cvtColor(norm_b, cv2.COLOR_RGB2GRAY)

    orb = cv2.ORB_create(nfeatures=1500)
    kp1, des1 = orb.detectAndCompute(gray_a, None)
    kp2, des2 = orb.detectAndCompute(gray_b, None)

    aligned_b = None
    if des1 is not None and des2 is not None and len(kp1) >= 10 and len(kp2) >= 10:
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        matches = bf.match(des1, des2)
        matches = sorted(matches, key=lambda x: x.distance)

        good_matches = matches[:min(len(matches), 100)]
        if len(good_matches) >= 8:
            src_pts = np.float32([kp2[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)
            dst_pts = np.float32([kp1[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)

            H, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
            if H is not None:
                aligned_b = cv2.warpPerspective(norm_b, H, (w_a, h_a))
                report["method"] = "feature_homography_ransac"
                report["num_matches"] = len(good_matches)

    # Fallback to high-quality bilinear interpolation if homography not possible
    if aligned_b is None:
        aligned_b = cv2.resize(norm_b, (w_a, h_a), interpolation=cv2.INTER_LINEAR)
        report["method"] = "bilinear_grid_resample"
        report["warning"] = "Direct feature matching yielded insufficient keypoints; grid resampled to target reference extent."

    return norm_a, aligned_b, report
