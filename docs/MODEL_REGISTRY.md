# SATQUERY AI — MODEL REGISTRY
**Catalog of Remote-Sensing Specialist Models and Lineage**

---

## 1. Registered Specialists

| Key | Model ID | Primary Capability | Adapted Lineage | Hardware Target |
| :--- | :--- | :--- | :--- | :--- |
| `vqa` | `SatQuery-RSVQA-v1` | Single-Image VQA | EuroSAT / RSVQA adapted | CUDA / CPU auto |
| `captioning` | `SatQuery-RS-Caption-v1` | Scene Captioning | Multi-scale LULC synthesis | CUDA / CPU auto |
| `grounding` | `SatQuery-Grounding-v1` | Text-Guided Grounding | Spatial feature segmentation | CUDA / CPU auto |
| `change_detection`| `SatQuery-Change-CVA-v1` | Bi-Temporal Change Detection | Radiometric CVA + Otsu | CUDA / CPU auto |
| `change_vqa` | `SatQuery-Change-VQA-v1` | Change-Grounded VQA | CD-VQA grounded pipeline | CUDA / CPU auto |
| `optical_sar` | `SatQuery-Optical-SAR-Fusion-v1` | Optical+SAR Cross-Modal Fusion | Dual-sensor backscatter fusion | CUDA / CPU auto |

---

## 2. Remote-Sensing Adaptation Pipeline

SatQuery AI includes a complete reproducible fine-tuning and evaluation pipeline in `backend/adaptation/`:
* **Dataset**: EuroSAT 10-Class Multispectral LULC benchmark (`AnnualCrop`, `Forest`, `HerbaceousVegetation`, `Highway`, `Industrial`, `Pasture`, `PermanentCrop`, `Residential`, `River`, `SeaLake`).
* **Architecture**: `RemoteSensingAdapterHead` (Deep convolutional feature extractor with adaptive pooling and classification projection).
* **Training Script**: `backend/adaptation/train.py`
* **Evaluation Script**: `backend/adaptation/evaluate.py`
* **Checkpoint**: `models/checkpoints/adapted_rs_head.pt`
* **Metadata**: `models/checkpoints/adaptation_metadata.json`

Users can toggle between the base model and the adapted remote-sensing model directly in the web UI workspace.
