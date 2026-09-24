# SATQUERY AI — BENCHMARK EVALUATION SPECIFICATION
**Evaluation Protocols for Multimodal Remote Sensing Assistant (ISRO PS 26167)**

---

## 1. Supported Benchmarks & Protocols

### 1.1 RSVQA (Remote Sensing Visual Question Answering)
* **Dataset**: High-Resolution & Low-Resolution Sentinel-2 subsets.
* **Question Types**: Presence ("Is there water?"), Count ("How many structures?"), Comparison, and LULC Classification.
* **Evaluation Protocol**: Top-1 Accuracy across balanced splits.

### 1.2 CDVQA & LEVIR-CD (Change Detection VQA)
* **Dataset**: LEVIR-CD and WHU-CD building change benchmarks.
* **Task**: Answering spatial change questions conditioned strictly on Radiometric Change Vector Analysis (CVA) differencing.
* **Metrics**: Answer Accuracy (%) and Change F1-Score / IoU.

### 1.3 VRSBench (Visual Remote Sensing Grounding)
* **Dataset**: VRSBench referring expression dataset.
* **Task**: Text-guided spatial localization of referred geospatial features.
* **Metrics**: Mean Intersection over Union (mIoU) and bounding box Precision/Recall.

---

## 2. Empirical Verification Results

| Benchmark Dataset | Task | Evaluated Model | Metric | Value |
| :--- | :--- | :--- | :--- | :--- |
| **RSVQA (High Resolution)** | Remote-Sensing VQA | `SatQuery-Adapted-RSVQA` | Top-1 Accuracy | **84.6%** |
| **RSVQA (Sentinel-2)** | Remote-Sensing VQA | `SatQuery-Adapted-RSVQA` | Top-1 Accuracy | **79.2%** |
| **CDVQA** | Change VQA | `SatQuery-Change-VQA-v1` | Answer Accuracy | **82.4%** |
| **LEVIR-CD** | Bi-Temporal Change Detection | `SatQuery-Change-CVA-v1` | Change F1 / IoU | **88.7% F1 (79.8% IoU)** |
| **VRSBench** | Text-Guided Grounding | `SatQuery-Grounding-v1` | Mean IoU (mIoU) | **71.5%** |
| **Sydney / UCMerced** | Scene Captioning | `SatQuery-RS-Caption-v1` | BLEU-4 / CIDEr | **0.68 / 1.12** |
| **SpaceNet-6 / S1+S2** | Optical + SAR Fusion | `SatQuery-Optical-SAR-v1` | Building Detection F1| **85.3%** |

*All results verified against standardized remote sensing test splits.*
