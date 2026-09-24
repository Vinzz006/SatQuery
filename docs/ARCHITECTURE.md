# SATQUERY AI — ARCHITECTURE & DESIGN SPECIFICATION
**ISRO Problem Statement 26167: Multimodal Vision-Language Assistant for Remote Sensing Image Analysis**

---

## 1. System Overview

SatQuery AI is an agentic, modular vision-language system engineered specifically for remote-sensing earth observation imagery. Unlike generic image chatbots that pass images directly to monolithic multimodal language models (often causing severe hallucination of geographic facts), SatQuery AI employs an **Agentic Specialist Pipeline**:

```text
                                  USER
                                    │
                                    ▼
                             NATURAL QUERY
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   AGENT CONTROLLER  │
                         └──────────┬──────────┘
                                    │
                         ┌──────────┴──────────┐
                         │ Query Classification│
                         │ Modality Check      │
                         │ Geospatial Engine   │
                         └──────────┬──────────┘
                                    │
                   ┌────────────────┼────────────────┐
                   ▼                ▼                ▼
             SINGLE-IMAGE      BI-TEMPORAL      OPTICAL + SAR
               SPECIALISTS      SPECIALISTS       SPECIALIST
             ┌───────────┐    ┌───────────┐    ┌──────────────┐
             │ • VQA     │    │ • Change  │    │ • Cross-Modal│
             │ • Caption │    │   Detect  │    │   Fusion     │
             │ • Ground  │    │ • Change  │    │ • Joint LULC │
             └───────────┘    │   VQA     │    └──────────────┘
                              └───────────┘
                                    │
                                    ▼
                              RESULT FUSION
                         ┌─────────────────────┐
                         │ Visual Evidence Gen │
                         │ Calibrated Conf.    │
                         │ Observable Trace    │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         FINAL STRUCTURED ANSWER
                         + PDF / JSON REPORTS
```

---

## 2. Core Architectural Components

### 2.1 Agentic Controller (`backend/app/agent/controller.py`)
The central orchestrator coordinates the following life cycle:
1. **Input Validation**: Verifies 1 or 2 images, format checks (.tif, .tiff, .geotiff, .png, .jpg), dimension checks, and sanitization.
2. **Geospatial & Radiometric Extraction**: Utilizes Rasterio to read Coordinate Reference Systems (CRS), affine transformations, geographic bounds, resolution, and multi-band profiles.
3. **Modality Identification**: Distinguishes Optical (RGB/multispectral) from SAR (Synthetic Aperture Radar) using band profiles, speckle coefficients ($Var(I) / Mean(I)^2$), and dynamic range.
4. **Deterministic & Semantic Routing**: Routes queries to the appropriate specialist based on query keywords and input modalities.
5. **Specialist Dispatch**: Lazy-loads and executes the designated specialist model.
6. **Result Fusion & Calibration**: Computes calibrated confidence scores from physical logits and radiometric concordances.
7. **Trace Assembly**: Records observable milestones (execution time, models, decisions) for auditability.

### 2.2 Anti-Hallucination Design
SatQuery AI enforces strict physical evidence grounding:
* **Change Detection**: Physical differencing determines changed pixel percentage (e.g. +14.7%) and primary change category. The language generator uses these verified metrics directly.
* **Optical + SAR Fusion**: Low SAR backscatter confirms specular water reflections, while high SAR backscatter confirms metallic/urban corner reflectors, validating optical features even under atmospheric haze.
* **Grounding**: Bounding boxes and segmentation masks are computed via spatial connected components and contours.

### 2.3 Specialist AI Registry (`backend/app/agent/registry.py`)
All capabilities inherit from `BaseSpecialistModel`:
* `vqa`: Remote-Sensing VQA (calibrated land cover, object counts, spatial presence).
* `captioning`: Holistic scene description describing composition, terrain, and infrastructure.
* `grounding`: Text-guided localization generating bounding boxes and masks.
* `change_detection`: Bi-temporal Radiometric Change Vector Analysis (CVA).
* `change_vqa`: Anti-hallucination question answering on temporal changes.
* `optical_sar`: Cross-modal feature fusion for cloud penetration and structure extraction.

### 2.4 Evidence Generation Engine (`backend/app/evidence/`)
Produces actionable spatial evidence:
* **Color-Coded Change Maps**: Crimson change regions on dark backgrounds with contour highlights.
* **Alpha-Blended Overlays**: Transparent highlighting overlaid on base imagery.
* **Aerospace HUD Bounding Boxes**: Normalized coordinates with confidence tags and corner brackets.
* **Optical-SAR Composites**: False color composites combining optical reflectance and SAR backscatter.
