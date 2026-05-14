# AeriSeg SIEM: Air-Gapped Isolation & Segmented Grid

AeriSeg is an enterprise-grade Segmented SIEM platform designed for high-security, air-gapped environments. It features the **AeriSeg Query Language (ASQL)** and a high-density, real-time monitoring dashboard.

## 🚀 Quick Start (Development)

1. **Install Dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   cd frontend && npm install
   ```
2. **Launch Full Stack**:
   From the project root:
   ```bash
   python start.py
   ```
   - **Frontend**: http://localhost:5173
   - **Backend**: http://localhost:8000
   - **Credentials**: `admin` / `admin123`

## 🛠 Features
- **ASQL Engine**: Advanced query language for segmented telemetry.
- **Identity Management**: Admin portal for analyst account provisioning and role management.
- **Real-time Telemetry**: EPS/IPS dashboards with websocket updates.
- **Threat Hunting**: Historical query interface with pivoting capabilities.
- **Rules Engine**: YAML-based detection rules with ASQL logic.

## 📂 Project Structure
- `/backend`: FastAPI service, detection engine, and database.
- `/frontend`: React + Tailwind CSS v4 dashboard.
- `/detection-rules`: YAML detection logic.
- `aeriseg.db`: Persistent SQLite storage.

## 🌍 Deployment
For production deployment instructions, please see [DEPLOYMENT.md](file:///c:/Users/SJ/Desktop/projects/siem/DEPLOYMENT.md).

---
© 2026 AeriSeg Cyber Defense Grid. Restricted Access.
