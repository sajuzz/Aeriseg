# 🛠️ AeriSeg Professional Setup Guide

This guide will walk you through the professional setup of the AeriSeg SIEM platform. Whether you are setting this up for a demo, a lab environment, or a production pilot, follow these steps carefully.

---

## 📋 1. Prerequisites Check

Before starting, ensure your host machine meets the following requirements:
*   **Operating System**: Windows 10/11 (WSL2 recommended but not required), Ubuntu 22.04+, or macOS.
*   **Memory**: Minimum 8GB RAM (16GB recommended for heavy telemetry).
*   **Python**: Version 3.12 or higher.
*   **Node.js**: Version 20.x (LTS) or higher.

---

## 📥 2. Initial Installation

### Step A: Clone and Segment
First, clone the repository into your secure environment:
```powershell
git clone https://github.com/sajuzz/medishield.git siem
cd siem
```

### Step B: Backend Preparation
We use a virtual environment to keep the system clean and isolated.
```powershell
python -m venv venv
.\venv\Scripts\activate
pip install -r backend/requirements.txt
```

### Step C: Frontend Preparation
The frontend uses Vite for blazing-fast development.
```powershell
cd frontend
npm install
cd ..
```

---

## ⚡ 3. The "Power On" Sequence

AeriSeg is designed to be easy to start. You have two options:

### Option 1: The Automated Bootstrapper (Recommended)
This script initializes the backend, seeds the initial dashboards, and starts the frontend.
```powershell
python start.py
```

### Option 2: Manual Control (For Debugging)
If you need to see raw logs from specific components:

**Terminal 1 (Backend):**
```powershell
cd backend
$env:ENABLE_MOCKS="true"  # Enable demo data
..\venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

**Terminal 2 (Frontend):**
```powershell
cd frontend
npm run dev
```

---

## 🔑 4. Accessing the Grid

Once both services are running:
*   **Open Browser**: `http://localhost:5173`
*   **Login**:
    *   **User**: `admin`
    *   **Password**: `admin123`

---

## 🧪 5. Verifying the Installation

1.  **Check the Pulse**: Go to the Dashboard. You should see a live EPS (Events Per Second) sparkline if `ENABLE_MOCKS` is true.
2.  **Verify Rules**: Navigate to the **Rules** page. You should see the default detection rules (e.g., `SQL Injection`, `Auth Brute Force`) loaded.
3.  **Run a Hunt**: Go to **Threat Hunt** and run a simple search (e.g., `*`). You should see telemetry events appearing in real-time.

---

## 🆘 Troubleshooting

*   **Syntax Errors**: Ensure you are using Python 3.12+.
*   **Port Conflicts**: If port 8000 or 5173 is in use, you can modify the `start.py` script or pass `--port` to the respective commands.
*   **Database Locked**: If you get a SQLite busy error, ensure only one instance of the backend is running.

---

*Welcome to the front lines of defense. Stay vigilant.*
