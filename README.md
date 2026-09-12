# 🛡️ AeriSeg SIEM: The Air-Gapped Sentinel

> **Enterprise-grade Security Operations Center (SOC) platform designed for high-security, segmented, and air-gapped environments.**

---

## 🌟 The Vision

In modern cyber warfare, the most critical assets live in **Air-Gapped Isolation**. Standard cloud-native SIEMs fail here due to external dependencies and heavy resource footprints. **AeriSeg** was born to bridge this gap—providing high-fidelity monitoring, real-time threat detection, and advanced forensics in a self-contained, high-performance package.

AeriSeg isn't just a dashboard; it's a **Defense Grid**. It prioritizes **Segmented Telemetry**, allowing analysts to pivot between isolated network segments without losing the "big picture."

---

## 🚀 Professional Quick Start

### 1. Prerequisites
* **Python 3.12+** (Optimized for performance)
* **Node.js 20+** (LTS recommended)
* **Git**

### 2. Environment Setup
Clone the repository and prepare the segmented environment:
```powershell
# Setup Python Virtual Environment
python -m venv venv
.\venv\Scripts\activate

# Install Backend Dependencies
pip install -r backend/requirements.txt

# Install Frontend Dependencies
cd frontend
npm install
cd ..
```

### 3. Launching the Application (How to Run)
AeriSeg features an integrated Python bootstrapper that automatically starts both the FastAPI backend and the React frontend concurrently.

To run the application, simply execute the `start.py` script from the root directory:

```powershell
# Make sure your virtual environment is activated first:
.\venv\Scripts\activate

# Start the application
python start.py
```

**Accessing the Application:**
* **Frontend UI**: [http://localhost:5173](http://localhost:5173)
* **Backend API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Default Credentials**: `admin` / `admin123`

---

## 🏗️ The Tech Stack (Core Engineering)

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **API Core** | [FastAPI](https://fastapi.tiangolo.com/) | High-performance, asynchronous Python framework with native JSON validation. |
| **Real-time Bus** | [NATS](https://nats.io/) | Lightweight, ultra-fast messaging system perfect for air-gapped log streaming. |
| **Storage** | [SQLite](https://sqlite.org/) | Portable, serverless persistence for configuration and alert metadata. |
| **Analytics** | [ASQL Engine](https://github.com/sajuzz/medishield) | Custom AeriSeg Query Language for efficient pivoting across telemetry segments. |
| **UI/UX** | [React](https://react.dev/) + [Vite](https://vitejs.dev/) | Modern, reactive interface with sub-millisecond hot-reload for dev productivity. |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first styling for a data-dense, high-density SOC interface. |

---

## 🔍 Deep Understanding: Core Pillars

### 1. ASQL (AeriSeg Query Language)
AeriSeg uses a custom abstraction layer called ASQL. It allows analysts to write intuitive queries like:
`SELECT alerts WHERE severity = 'CRITICAL' FROM segment 'DMZ-01' LAST 1h`
This is translated into optimized database queries, handling the complexity of segmented data behind the scenes.

### 2. The Detection Confidence Engine
AeriSeg doesn't just alert; it **scores**. Every detection passes through a confidence engine that weights:
* Source Reliability
* Historical Pattern Matching
* Segment Sensitivity
* Multi-stage Correlation

### 3. Real-time Telemetry Ingestion
Using a NATS-backed pipeline, AeriSeg can process thousands of Events Per Second (EPS) with minimal latency. The frontend connects via WebSockets to provide live, blinking-light updates without manual refreshes.

---

## 📂 Project Anatomy

```text
├── /backend              # FastAPI service & Core Engine
│   ├── /app/api          # Modular API routes (Alerts, Assets, Stats)
│   ├── /app/core         # Critical logic: Scheduler, Demo Manager
│   ├── /app/detection    # The Brain: Rule evaluation & Engine
│   └── /migrations       # Database schema evolution
├── /frontend             # React + Tailwind Dashboard
│   ├── /src/components   # High-density SOC widgets
│   └── /src/pages        # Functional views (Threat Hunt, Analysts)
├── /detection-rules      # YAML-based threat logic
└── aeriseg.db            # Persistent state (SQLite)
```

---

## 🛠️ Operational Guide for Analysts

### Phase 1: Situational Awareness
Start at the **Global Dashboard**. Monitor the "Heartbeat" (EPS/IPS) and check for any "Segment Spikes." A sudden increase in EPS in an air-gapped segment is often the first indicator of lateral movement.

### Phase 2: Threat Hunting
Use the **Threat Hunt** interface to query historical telemetry. Pivot from an IP address to a Process ID (PID) to understand the full execution chain.

### Phase 3: Case Management
Once a threat is confirmed, escalate it to an **Investigation**. Assign analysts, attach evidence, and document the remediation steps directly within the AeriSeg platform.

---

## 🛡️ License & Security
© 2026 AeriSeg Cyber Defense Grid. Restricted Access. Designed for authorized security professionals.

---
*Built with ❤️ for the next generation of SOC Analysts.*
