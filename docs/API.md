# SATQUERY AI — REST API DOCUMENTATION
**API Version**: 1.0.0  
**Base URL**: `http://localhost:8000/api/v1`

---

## 1. System Endpoints

### `GET /health`
Returns system status, version, and hardware acceleration device.
```json
{
  "status": "online",
  "project": "SatQuery AI",
  "version": "1.0.0",
  "device": "cpu",
  "isro_problem_statement": "26167"
}
```

### `GET /models`
Lists all registered remote-sensing specialists and their operational statuses.

---

## 2. Ingestion Endpoints

### `POST /upload`
Uploads up to 2 satellite images (GeoTIFF, TIFF, PNG, JPEG). Extracts geospatial metadata and returns preview URLs.
* **Payload**: `multipart/form-data` with `files`
* **Response**: List of `ImageMetadata`

### `GET /samples`
Returns pre-bundled satellite assets configured for all 5 demo scenarios.

---

## 3. Analysis Endpoints

### `POST /analyze` (Universal Agentic Endpoint)
Automatically classifies the query, identifies modalities, selects the specialist, and outputs grounded answers and visual evidence.
```json
{
  "query": "What changed between these two images?",
  "image_ids": ["sample_change_2024_t1.png", "sample_change_2026_t2.png"],
  "use_adapted_model": true,
  "parameters": {}
}
```
**Response**:
```json
{
  "id": "a9d72c1f",
  "task": "change_vqa",
  "query": "What changed between these two images?",
  "answer": "Analysis of the bi-temporal imagery reveals a total surface change of 14.7%...",
  "confidence": 0.89,
  "confidence_label": "89% (Change Vector & Semantic Alignment)",
  "models": ["SatQuery-Change-CVA-v1", "SatQuery-Change-VQA-v1"],
  "evidence": [
    {
      "id": "art_cmap_83fa1c",
      "type": "change_map",
      "title": "Bi-Temporal Change Map",
      "url": "/api/v1/artifacts/change_map_83fa1c.png"
    }
  ],
  "trace": [
    {
      "step": 1,
      "name": "Query Ingestion",
      "details": "Received natural language query...",
      "timestamp": "14:10:02.124Z",
      "duration_ms": 1.2
    }
  ],
  "statistics": {
    "changed_percentage": 14.7,
    "primary_change_type": "Built-up infrastructure expansion"
  },
  "execution_time_ms": 182.4,
  "report_url": "/api/v1/reports/a9d72c1f/pdf"
}
```

---

## 4. Reports & Verification

### `GET /reports/{id}/pdf`
Downloads an executive ISRO-styled PDF report containing metadata, query, grounded response, evidence thumbnails, and execution trace.

### `GET /reports/{id}/json`
Exports the structured analysis session in JSON format.

### `GET /evaluation`
Returns official remote-sensing benchmark scores (RSVQA, CDVQA, LEVIR-CD, VRSBench).
