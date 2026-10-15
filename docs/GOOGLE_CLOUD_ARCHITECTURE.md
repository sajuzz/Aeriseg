# ☁️ Google Cloud Architecture for Industrial Operations & Manufacturing
### AeriSeg Industrial Cyber-Physical Security & Efficiency Platform (AI Builder Cup 2026)

> **Track:** Manufacturing — Intelligent Operations & Industrial Efficiency  
> **Platform:** AeriSeg SIEM+SOAR Industrial Grid  
> **Target Cloud:** Google Cloud Platform (GCP)  
> **Document Version:** 1.0.0  

---

## 1. Executive Summary & Google Cloud Synergy

Modern smart manufacturing relies on the cyber-physical convergence of Industrial Control Systems (ICS / OT) and enterprise IT. High-speed assembly lines, robotics cells, and critical controllers (PLCs/RTUs) generate heterogeneous telemetry—ranging from continuous time-series sensor streams (temperature, vibration, pressure) and protocol messages (Modbus TCP, Siemens S7comm) to thermal camera inspection feeds and endpoint process events.

The **AeriSeg Industrial Security & Intelligence** platform leverages Google Cloud's end-to-end data and AI ecosystem to deliver a unified, zero-downtime, safety-first manufacturing grid:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          PURDUE MODEL INDUSTRIAL TELEMETRY                             │
│   • L0/L1: Field Sensors, Actuators & PLCs (Modbus TCP, S7comm, EtherNet/IP)           │
│   • L2: Area Supervisory SCADA & Operator HMIs                                         │
│   • L3: Plant Operations, Process Historian & Engineering Workstations                 │
│   • L4: Enterprise IT, Supply Chain & Work Order Systems                               │
│   • Thermal / Optical QA Inspection Cameras                                            │
└───────────────────────────┬────────────────────────────────┬───────────────────────────┘
                            │ (High-freq telemetry / events) │ (Inspection images & video)
                            ▼                                ▼
┌──────────────────────────────────────────────┐ ┌───────────────────────────────────────┐
│              GOOGLE CLOUD PUB/SUB            │ │       GOOGLE CLOUD STORAGE (GCS)      │
│  • Globally scalable, low-latency streaming  │ │  • gs://aeriseg-thermal-inspect       │
│  • Per-asset ordered event messaging         │ │  • gs://aeriseg-industrial-evidence   │
│  • Decouples edge sensors from cloud workers │ │  • Raw PCAPs, firmware blobs & images │
└───────────────────────┬──────────────────────┘ └───────────────────┬───────────────────┘
                        │                                            │
                        ▼                                            ▼
┌──────────────────────────────────────────────┐ ┌───────────────────────────────────────┐
│            GOOGLE CLOUD DATAFLOW             │ │            GOOGLE VISION AI           │
│  • Managed Apache Beam stream processing     │ │  • Vertex AI Vision / AutoML Vision   │
│  • Sliding 300s correlation & deduplication  │ │  • Motor & bearing overheat detection │
│  • Normalization into Elastic Common Schema  │ │  • Surface defect & packaging QA      │
└───────────────┬──────────────────────┬───────┘ └───────────────────┬───────────────────┘
                │                      │                             │
    (Fast Alert │          (Enriched   │                             │ (Vision Inference
     Streaming) │           Telemetry) │                             │  Events & Anomaly Tags)
                ▼                      ▼                             │
┌───────────────────────────┐  ┌─────────────────────────────────┐  │
│      GOOGLE CLOUD RUN     │  │         GOOGLE BIGQUERY         │◄─┘
│ • FastAPI Core Engine     │  │ • Petabyte sensor warehouse     │
│ • React 18 SOC Workbench  │  │ • Long-term OEE & MTTR trends   │
│ • Deterministic Safety    │  │ • BigQuery ML time-series model │
│ • WebSocket Telemetry     │  └───────────────┬─────────────────┘
└─────────────┬─────────────┘                  │
              │                                │
              ▼                                ▼
┌───────────────────────────┐  ┌─────────────────────────────────┐
│   GEMINI ON VERTEX AI     │  │       VERTEX AI (ML & PDM)      │
│ • Multi-turn reasoning    │  │ • Predictive Maintenance models │
│ • Plain-English RCA briefs│  │ • Remaining Useful Life (RUL)   │
│ • ISA/IEC 62443 SOPs      │  │ • Sensor outlier regression     │
│ • Shift handover summaries│  │ • Asset failure probability     │
└───────────────────────────┘  └─────────────────────────────────┘
```

---

## 2. Google Cloud Technology Mapping & Functional Responsibilities

| Google Cloud Service | Functional Role | Manufacturing & Industrial Security Application |
| :--- | :--- | :--- |
| **Gemini on Vertex AI** | Reasoning & Operational Assistance | Synthesizes multi-source cross-zone anomalies, explains PLC register tampering in plain English, and provides step-by-step SOPs and shift handovers. |
| **Vertex AI** | Predictive & Machine-Learning Workloads | Trains and serves AutoML time-series models for Predictive Maintenance (PdM), Remaining Useful Life (RUL), and MTBF failure forecasting. |
| **Google BigQuery** | Sensor & Operational Data Analysis | Serverless analytics warehouse storing billions of sensor heartbeats, process historian logs, and running BigQuery ML for OEE correlation. |
| **Google Cloud Storage (GCS)** | Images, Sensor Data, and Files | Object storage for high-resolution optical and thermal inspection images, raw network PCAP files, and immutable forensic audit trails. |
| **Google Vision AI** | Image & Video Analysis Capabilities | Automated inspection of assembly lines for micro-defects and thermal camera infrared analysis to detect overheating bearings before seizure. |
| **Google Cloud Pub/Sub** | Streaming & Event-Driven Data | Scalable ingestion queue capturing high-frequency Modbus, S7comm, and host agent telemetry with guaranteed delivery and order keys. |
| **Google Cloud Dataflow** | Data Pipelines (Apache Beam) | Real-time sliding window deduplication, chronological re-sequencing, ECS normalization, and dual-sink streaming to Cloud Run and BigQuery. |
| **Google Cloud Run** | Application & Processing Services | Serverless container execution hosting the AeriSeg FastAPI backend, WebSockets real-time broadcaster, and React 18 Analyst Workbench. |

---

## 3. Deep-Dive Component Specifications

### 3.1. Gemini on Vertex AI — Operational Reasoning & Plant Assistant
* **Model Choices:** `gemini-1.5-flash` or `gemini-2.0-flash` hosted on Vertex AI Model Garden.
* **Temperature:** `0.2` (Configured for deterministic, grounded industrial operations).
* **Role & Tasks:**
  1. **Root-Cause Analysis (RCA):** Translates complex ICS telemetry (e.g., Modbus function code 0x06 write to holding register `4x0023` on PLC-7) into operational impact.
  2. **ISA/IEC 62443 & NERC CIP Guidance:** Recommends containment steps that strictly preserve safety loops and prevent unplanned production stoppages.
  3. **Shift Handover Synthesis:** Automatically compiles plant-floor incident briefs, maintenance dampener states, and open human approval requests for the incoming shift supervisor.
  4. **Dual-Mode Graceful Fallback:** If internet connectivity to Vertex AI is interrupted in air-gapped zones, the system seamlessly activates the internal deterministic template engine without error.

### 3.2. Vertex AI — Predictive & Machine Learning Workloads
* **Capabilities:** Vertex AI Pipelines, AutoML Tables, and Vertex AI Endpoints.
* **Manufacturing Workloads:**
  1. **Predictive Maintenance (PdM):** Models trained on sensor metrics (bearing vibration frequencies, motor amperage, coil thermal dissipation, operating cycle counts).
  2. **MTBF & Remaining Useful Life (RUL):** Computes estimated days to failure for critical assembly components (e.g., *PLC-7 MTBF: 14 days, failure cost: $84k/hr*).
  3. **Behavioral Telemetry Baselines:** Learns normal communication intervals between Purdue L3 Engineering Workstations and L1 PLCs, flagging statistical outliers before exploits occur.

### 3.3. Google BigQuery — Sensor & Operational Data Analytics
* **Dataset Schema:** `aeriseg_factory_telemetry` partitioned by `DAY(timestamp)` and clustered by `purdue_level`, `asset_id`, and `protocol`.
* **Analytical Workloads:**
  1. **Fleet-Wide OEE Analytics:** Computes Availability, Performance, and Quality scores across all manufacturing lines over days, weeks, and quarters.
  2. **BigQuery ML (In-Database ML):** Runs `ARIMA_PLUS` models directly in SQL to forecast sensor degradation trends without exporting data:
     ```sql
     CREATE OR REPLACE MODEL `aeriseg.pdm_sensor_forecast`
     OPTIONS(model_type='ARIMA_PLUS', time_series_timestamp_col='ts', time_series_data_col='temperature_celsius') AS
     SELECT timestamp AS ts, temperature_celsius
     FROM `aeriseg_factory_telemetry.line1_drives`
     WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY);
     ```
  3. **ASQL Query Target:** The AeriSeg Query Language (ASQL) compiler translates analyst search syntax into optimized BigQuery SQL for historical threat hunting.

### 3.4. Google Cloud Storage (GCS) — Evidence Locker & Industrial Assets
* **Buckets:**
  * `gs://aeriseg-industrial-evidence/`: Immutable forensic locker storing raw `.pcap` files, process memory dumps, and configuration diffs.
  * `gs://aeriseg-thermal-inspect/`: High-resolution infrared frames and optical inspection imagery.
  * `gs://aeriseg-firmware-vault/`: Verified golden firmware binaries for hash comparison against active PLCs.
* **Security & Governance:** Object Versioning, Customer-Managed Encryption Keys (CMEK), and 365-day lifecycle retention policies for regulatory compliance.

### 3.5. Google Vision AI & Vertex AI Vision — Visual Quality & Thermal Inspection
* **Workloads:**
  1. **Thermal Camera Bearing Monitoring:** Continuous analysis of FLIR / infrared camera feeds focused on high-speed drive motors and conveyor gearboxes. Identifies temperature differentials exceeding threshold ($85^\circ\text{C}$) before mechanical seizure.
  2. **Defect & Quality Assurance (QA):** Object classification on product assembly feeds to detect missing fasteners, misaligned connectors, or defective seals, flagging micro-stoppages.
  3. **Perimeter & Physical Safety:** Detects unauthorized human entry into robotic work cells or unequipped personnel lacking mandatory PPE.

### 3.6. Google Cloud Pub/Sub — Real-Time Streaming Ingestion Bus
* **Topics & Subscriptions:**
  * Topic: `projects/aeriseg/topics/factory-telemetry-stream`
  * Ordering: Enabled with `ordering_key = asset_id` to guarantee strictly chronological delivery per PLC.
* **Key Advantages:** Absorbs massive traffic spikes (up to 100,000+ EPS during fleet-wide polling or cyber-physical attack storms) without backpressure drops on edge controllers.

### 3.7. Google Cloud Dataflow — Stream Processing & Normalization
* **Pipeline Framework:** Managed Apache Beam running in streaming mode.
* **Transformations:**
  1. **Sliding Window Deduplication:** Evaluates 300-second windows with hash-based exact deduplication to drop redundant sensor echoes.
  2. **ECS Normalization:** Standardizes custom Modbus and S7comm register payloads into Elastic Common Schema (ECS).
  3. **Asset Enrichment:** Joins incoming events with Purdue Model Asset Registry metadata (criticality rating, zone, maintenance window state).
  4. **Dual-Sink Routing:** Pushes real-time alerts to Cloud Run via Pub/Sub push subscription while batch-loading enriched rows into BigQuery.

### 3.8. Google Cloud Run — Serverless Core Application Services
* **Containerized Workloads:**
  1. `aeriseg-backend`: FastAPI asynchronous REST API, WebSockets real-time server (`/ws/telemetry`), ASQL compiler, and deterministic scoring engine.
  2. `aeriseg-frontend`: React 18 + Vite + Tailwind CSS v4 single-page application serving the 21 SOC workstations, Copilot interface, and scenario demonstration lab.
* **Cloud Run Configuration:**
  * Concurrency: 80 requests per container instance.
  * Autoscaling: 1 to 10 instances with minimum 1 warm instance for sub-millisecond response.
  * Direct VPC Egress: Private connectivity to Cloud SQL and internal enterprise VPCs.

---

## 4. End-to-End Operational Lifecycle: Scenario Walkthrough

To see how all 8 Google Cloud services collaborate in a live industrial event:

```
[1. Sensor Event] ──► Assembly Line 1 drive motor experiences abnormal vibration & register write.
       │
[2. Pub/Sub]      ──► Ingests high-frequency Modbus stream with asset_id ordering key.
       │
[3. Dataflow]     ──► Deduplicates event, enriches with Purdue L1 & Criticality: HIGH, sinks to BigQuery.
       │
[4. Vision AI]    ──► Thermal camera captures hot-spot on motor bearing (92°C), saves frame to Cloud Storage.
       │
[5. Vertex AI]    ──► Predictive model computes RUL: 18 hours until mechanical failure; MTBF loss: 38%.
       │
[6. BigQuery]     ──► Correlates vibration spikes with 3 prior micro-stoppages logged over the past 14 days.
       │
[7. Cloud Run]    ──► Calculates deterministic score: S_sec=75, S_crit=100, S_mfg=100. Pushes alert via WebSocket.
       │
[8. Gemini]       ──► Synthesizes operational brief: "Recommend safe bypass to Secondary Line B.
                      Human authorization required to isolate PLC-101."
```

---

## 5. Deployment Commands: Google Cloud CLI Reference

### 1. Authenticate & Configure GCP Project
```bash
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID
gcloud config set compute/region us-central1
```

### 2. Enable Required Google Cloud APIs
```bash
gcloud services enable \
  run.googleapis.com \
  aiplatform.googleapis.com \
  bigquery.googleapis.com \
  storage.googleapis.com \
  pubsub.googleapis.com \
  dataflow.googleapis.com \
  vision.googleapis.com
```

### 3. Create Pub/Sub Topic and GCS Buckets
```bash
# Ingestion Topic
gcloud pubsub topics create factory-telemetry-stream --message-ordering

# Storage Buckets
gcloud storage buckets create gs://aeriseg-industrial-evidence --location=us-central1
gcloud storage buckets create gs://aeriseg-thermal-inspect --location=us-central1
```

### 4. Deploy Backend & Frontend to Cloud Run
```bash
# Build and deploy AeriSeg Core to Cloud Run
gcloud builds submit --tag gcr.io/YOUR_GCP_PROJECT_ID/aeriseg-industrial-core backend/

gcloud run deploy aeriseg-industrial-core \
  --image gcr.io/YOUR_GCP_PROJECT_ID/aeriseg-industrial-core \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY="YOUR_KEY",GCP_PROJECT_ID="YOUR_GCP_PROJECT_ID" \
  --memory 1Gi \
  --cpu 1 \
  --concurrency 80
```

---

*Authored for the AeriSeg Industrial Cyber-Physical Defense Grid — Google Cloud AI Builder Cup 2026 Submission.*
