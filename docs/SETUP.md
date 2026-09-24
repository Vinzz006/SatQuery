# SATQUERY AI — SETUP & DEPLOYMENT GUIDE

---

## 1. Prerequisites
* **Python**: 3.10 to 3.13
* **Node.js**: v18.0.0 or higher
* **npm**: 9.0.0 or higher
* **Hardware**: CPU supported out-of-the-box (`DEVICE=auto`). NVIDIA CUDA GPU automatically utilized if available.

---

## 2. Backend Setup

1. Open PowerShell / Terminal:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Generate sample assets and train the adapted model checkpoint:
   ```bash
   python -m app.remote_sensing.sample_assets
   python -m adaptation.train
   ```
4. Run automated test suite:
   ```bash
   pytest tests/
   ```
5. Launch FastAPI server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   * Interactive API docs: `http://localhost:8000/docs`

---

## 3. Frontend Setup

1. Open a new Terminal:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   * Web application: `http://localhost:5173`

---

## 4. Docker Deployment

Launch both backend and frontend in containerized environments:
```bash
docker-compose up --build
```
