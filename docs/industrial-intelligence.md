# 🏭 AeriSeg Industrial Security Intelligence
### Intelligent Operations & Industrial Continuity for Manufacturing (AI Builder Cup 2026)

> **Platform:** AeriSeg SIEM+SOAR Extension  
> **Track:** Manufacturing — Intelligent Operations & Industrial Efficiency  
> **Target Environment:** Manufacturing Facilities, Discrete Assembly, Process Plants & Air-Gapped OT Grids  
> **AI Architecture:** Dual-Mode Architecture (Google Gemini Copilot + Deterministic Mathematical Fallback)  

---

## 1. Executive Summary & Purpose

Modern manufacturing facilities operate on cyber-physical convergence: enterprise IT networks are interconnected with Industrial Control Systems (ICS) and Operational Technology (OT). When an adversary pivots from an IT or engineering workstation into supervisory control (SCADA) or basic control (PLCs), standard cloud SIEMs struggle:
1. They generate false positives during scheduled maintenance windows, causing expensive operational halts.
2. They escalate alerts blindly without distinguishing between an office desktop and a high-criticality conveyor drive PLC.
3. They lack transparent mathematical explanations, forcing plant operators to guess why an alert fired.
4. Autonomous containment can trip safety loops and halt live production lines costing $25k+/hour.

**AeriSeg Industrial Security Intelligence** extends AeriSeg with an **explainable, asset-context-aware, safety-first cybersecurity intelligence engine**. It combines:
- **Purdue Model Asset Registry (Levels 0–4)** with operational criticality ratings.
- **Cross-Zone IT/OT Event Correlation** detecting lateral pivot chains (e.g., Engineering Workstation ➔ PLC).
- **Deterministic Manufacturing Impact Scoring ($0–100$)** with fully transparent formulas.
- **Explainable Incident Reports** that strictly separate observed facts from hypotheses.
- **Google Gemini AI Operational Synthesis** generating plant-floor briefings with seamless offline fallback.
- **Policy-Aware Response Approval Gates** preventing disruptive actions without authorized human sign-off.

---

## 2. System Architecture & Information Flow

```
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                              SIMULATED MANUFACTURING TELEMETRY                         │
 │   • Engineering Host Processes (PowerShell / Studio 5000)                              │
 │   • Industrial Protocol Traffic (Modbus TCP, S7comm, EtherNet/IP)                      │
 │   • Field Calibration & Maintenance Logs                                               │
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                       INDUSTRIAL EVENT CORRELATION ENGINE                              │
 │   • Hash-based deduplication filter (drops byte-identical repeats)                     │
 │   • Sliding time window aggregation (default: 300s)                                    │
 │   • Chronological re-ordering for out-of-order & late-arriving events                  │
 │   • Cross-Zone Pivot Detection (Purdue L3/L4 ➔ L1/L2)                                  │
 └───────────────────────────────────────────┬────────────────────────────────────────────┘
                                             │
                                             ▼
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                      DETERMINISTIC IMPACT SCORING ENGINE                               │
 │   • Security Severity Score ($S_{sec} \in \{25, 50, 75, 100\}$)                        │
 │   • Asset Criticality Score ($S_{crit} \in \{20, 50, 80, 100\}$)                       │
 │   • Detection Confidence Score ($S_{conf} \in [0, 100]$)                               │
 │   • Forensic Evidence Strength Score ($S_{evid} \in [0, 100]$)                         │
 │   • Potential Manufacturing Impact ($S_{mfg} = S_{crit} \times \text{PurdueWeight}$)   │
 │   • Maintenance Window Dampener ($0.40\times$ suppression if scheduled)                │
 └───────────────────────┬──────────────────────────────────────┬─────────────────────────┘
                         │                                      │
                         ▼                                      ▼
 ┌──────────────────────────────────────────────┐     ┌───────────────────────────────────┐
 │        TRACEABLE FACTUAL EXPLAINER           │     │    RESPONSE RECOMMENDATION ENGINE │
 │ • Verifiable observed facts list             │     │ • Non-disruptive forensic triage  │
 │ • Hypotheses & possibilities separation      │     │ • Disruptive host quarantine      │
 │ • Missing context & uncertainty indicators   │     │ • Industrial firewall flow block  │
 └───────────────────────┬──────────────────────┘     │ • HUMAN APPROVAL GATE REQUIRED    │
                         │                            └─────────────────┬─────────────────┘
                         ▼                                              │
 ┌──────────────────────────────────────────────┐                       │
 │   GOOGLE GEMINI INDUSTRIAL COPILOT           │                       ▼
 │ • Gemini 1.5/2.0 Flash REST Integration      │     ┌───────────────────────────────────┐
 │ • Natural-language plant engineer briefing   │     │  SIMULATED INDUSTRIAL CONNECTOR   │
 │ • Offline graceful fallback mode             │     │ • In-memory containment execution │
 └───────────────────────┬──────────────────────┘     │ • Audit log traceability          │
                         │                            └─────────────────┬─────────────────┘
                         │                                              │
                         └───────────────────────┬──────────────────────┘
                                                 ▼
                               ┌──────────────────────────────────┐
                               │   INDUSTRIAL INTEL WORKBENCH     │
                               │   (React + Vite + Tailwind CSS)  │
                               └──────────────────────────────────┘
```

---

## 3. Purdue Model Asset Hierarchy & Synthetic Factory

AeriSeg models industrial assets aligned with the **ISA-95 / Purdue Enterprise Reference Architecture**:

| Purdue Level | Description | Example Assets in Synthetic Factory | Typical Network Segment |
| :--- | :--- | :--- | :--- |
| **Level 4** | Enterprise IT Network | `IND-IT-01` (Procurement Workstation) | `IT-CORP-VLAN-10` |
| **Level 3** | Manufacturing Operations & DMZ | `IND-ENG-01` (Engineering Workstation Alpha)<br>`IND-ENG-02` (Maintenance Laptop Beta)<br>`IND-MES-01` (Manufacturing Execution Server)<br>`IND-HIST-01` (Plant Process Historian) | `ENG-VLAN-20`<br>`DMZ-VLAN-30` |
| **Level 2** | Area Supervisory Control | `IND-SCADA-01` (Central SCADA Server)<br>`IND-HMI-01` (Line 1 Operator Touchscreen HMI) | `OT-SUPERVISORY-VLAN-100` |
| **Level 1** | Basic Control & PLCs | `IND-PLC-101` (Assembly Line 1 Main Drive PLC)<br>`IND-PLC-102` (Packaging Cell Safety Interlock PLC) | `OT-CONTROL-VLAN-110` |

### Asset Criticality vs. Security Severity
- **Security Severity** (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`): Represents the technical maliciousness of an alert (e.g. unknown scanning vs. known exploit payload).
- **Asset Criticality** (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`): Represents the physical/operational consequence if the asset fails (e.g., stopping Line 1 conveyor halts vehicle assembly costing $25k/hr).
- **Crucial Rule:** High asset criticality increases potential manufacturing impact, but **never invents false detection confidence**.

---

## 4. Deterministic Manufacturing Impact Scoring Formula

The overall priority score is calculated through a strictly transparent, bounded mathematical model ($Score \in [0.0, 100.0]$):

$$\text{RawScore} = \left( w_{sec} \cdot S_{sec} \right) + \left( w_{crit} \cdot S_{crit} \right) + \left( w_{conf} \cdot S_{conf} \right) + \left( w_{evid} \cdot S_{evid} \right) + B_{corrob}$$

### Weights & Parameters
- $w_{sec} = 0.35$ (Security Detection Severity weight)
- $w_{crit} = 0.25$ (Asset Operational Criticality weight)
- $w_{conf} = 0.25$ (Detection Confidence weight)
- $w_{evid} = 0.15$ (Evidence Completeness weight)
- $B_{corrob} = 10.0$ (Corroboration bonus applied when 2+ independent events support the attack chain)

### Component Scoring Details
1. **Severity Score ($S_{sec}$):** Low = 25, Medium = 50, High = 75, Critical = 100.
2. **Criticality Score ($S_{crit}$):** Low = 20, Medium = 50, High = 80, Critical = 100.
3. **Detection Confidence ($S_{conf}$):** Bounded $[0.0, 100.0]$.
4. **Evidence Strength ($S_{evid}$):** Computed additively based on presence of verifiable fields:
   - Source IP present (+15)
   - Destination IP present (+15)
   - Process / command line captured (+25)
   - Originating user account (+15)
   - Deep inspection payload / protocol function code (+20)
   - Authoritative timestamp (+10)
5. **Potential Manufacturing Impact Score ($S_{mfg}$):**
   $$S_{mfg} = S_{crit} \times \text{PurdueWeight}$$
   Where Purdue L0/L1 = 1.0, L2 = 0.90, L3 = 0.75, L4 = 0.35.

### Maintenance Window Suppression
If an asset is in an active maintenance window (`maintenance_window.is_active == True`), the raw score is dampened by 60%:
$$\text{PriorityScore} = \text{RawScore} \times 0.40$$
The system explicitly logs: *"Active maintenance window detected; priority dampened by 60%."*

---

## 5. Google Gemini AI Operational Copilot Integration

To meet the **AI Builder Cup 2026** requirement for Google AI integration while respecting the zero-cost ($0) development constraint:
1. **Google AI Studio Free Tier:**
   - Uses Google Gemini models (`gemini-1.5-flash` or `gemini-2.0-flash`) via direct HTTPS REST requests using `urllib.request`.
   - Free tier includes 15 Requests Per Minute (RPM) at ₹0 cost.
   - Configure via environment variable:
     ```powershell
     $env:GEMINI_API_KEY="your-free-gemini-api-key"
     ```
2. **Strict Grounding & Hallucination Prevention:**
   - Gemini is supplied with only the observed facts, timestamps, and rule IDs.
   - Outputs a structured JSON schema:
     - `executive_summary`
     - `operational_risk_assessment`
     - `ot_engineer_briefing`
     - `priority_recommendation`
3. **Graceful Offline Fallback:**
   - If `GEMINI_API_KEY` is omitted or network is disconnected, the engine falls back to the internal deterministic rule-based template engine without throwing errors.

---

## 6. Safety-First Response Recommendations & Human Approval Gates

Industrial environments cannot tolerate automated, autonomous containment actions that sever communications to running physical processes. AeriSeg implements a two-tier recommendation framework:

### Tier 1: Non-Disruptive Forensic Triage (Approval Not Required)
- Inspect host process tree and command history.
- Consult the designated shift OT engineer.
- Audit industrial firewall ACL segmentation rules.

### Tier 2: Disruptive Containment Actions (HUMAN APPROVAL MANDATORY)
- **Simulated Host Quarantine:** Isolating the engineering workstation to prevent further command transmission.
- **Simulated Flow Block:** Blocking traffic between Engineering VLAN and PLC control subnet.
- **Enforcement:** Actions default to `approval_status: "pending"`. Clicking *"Authorize"* executes the safe in-memory `SimulatedIndustrialConnector` and logs an audit trail.

---

## 7. REST API Endpoints Reference

All endpoints are mounted under `/api/industrial-intelligence`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/industrial-intelligence/assets` | List registered industrial assets with Purdue level filters |
| `POST` | `/api/industrial-intelligence/assets` | Register a new simulated manufacturing asset |
| `GET` | `/api/industrial-intelligence/assets/{id}` | View asset metadata, zone, and criticality |
| `PATCH` | `/api/industrial-intelligence/assets/{id}` | Update asset attributes |
| `POST` | `/api/industrial-intelligence/assets/{id}/maintenance` | Toggle active maintenance window |
| `POST` | `/api/industrial-intelligence/assess-alert` | Calculate deterministic manufacturing impact score for an alert |
| `POST` | `/api/industrial-intelligence/events` | Ingest event into the cross-zone correlation engine |
| `GET` | `/api/industrial-intelligence/incidents` | List active correlated industrial incidents |
| `GET` | `/api/industrial-intelligence/incidents/{id}` | View detailed incident telemetry and timeline |
| `GET` | `/api/industrial-intelligence/incidents/{id}/explanation` | Generate evidence-traceable factual explanation and Gemini AI synthesis |
| `GET` | `/api/industrial-intelligence/incidents/{id}/recommendations` | Retrieve safety-aware response recommendations |
| `POST` | `/api/industrial-intelligence/recommendations/{id}/decision` | Record authorized human review (APPROVED/REJECTED) |
| `GET` | `/api/industrial-intelligence/scenarios` | List synthetic demonstration scenarios (A through F) |
| `POST` | `/api/industrial-intelligence/scenarios/{id}/run` | Execute demonstration scenario |

---

## 8. Synthetic Demonstration Scenarios (Scenarios A through F)

Analysts can execute any scenario with a single click from the **Scenario Demonstrator Lab** in the UI:

- **Scenario A (Benign Maintenance):** Maintenance field laptop polls safety PLC during scheduled maintenance. Demonstrates priority score suppression and maintenance tagging.
- **Scenario B (Suspicious Endpoint Scripting):** Engineering workstation launches obfuscated PowerShell. Demonstrates early endpoint detection prior to lateral movement.
- **Scenario C (Correlated IT/OT Cross-Zone Pivot):** Scripting anomaly followed by direct S7comm write commands to Assembly Line 1 PLC. Demonstrates multi-event correlation, Purdue cross-zone pivot alert, and CRITICAL manufacturing impact.
- **Scenario D (Repeated Authentication Failures):** Failed login sequence against engineering host. Demonstrates evidence strength evaluation.
- **Scenario E (False-Positive Control):** Uncorroborated port probe lacking process or payload evidence. Demonstrates uncertainty tracking preventing false alarm escalation.
- **Scenario F (Comparative Asset Criticality Context):** Evaluates identical suspicious execution against an IT Workstation vs. a Critical PLC to demonstrate that operational impact changes without altering underlying evidence.

---

## 9. Google Cloud Run Deployment Guide

To deploy the AeriSeg Industrial Security Intelligence container to **Google Cloud Run** for the hackathon submission:

### 1. Build and Test Locally
```powershell
docker build -t aeriseg-industrial -f backend/Dockerfile backend/
```

### 2. Deploy to Google Cloud Run
```bash
# Set project and region
gcloud config set project YOUR_GCP_PROJECT_ID
gcloud config set run/region us-central1

# Build and push using Cloud Build
gcloud builds submit --tag gcr.io/YOUR_GCP_PROJECT_ID/aeriseg-industrial backend/

# Deploy container to Cloud Run
gcloud run deploy aeriseg-industrial \
  --image gcr.io/YOUR_GCP_PROJECT_ID/aeriseg-industrial \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY="YOUR_GEMINI_API_KEY" \
  --memory 1Gi \
  --cpu 1
```

---

## 10. Automated Test Results & Verification

All 17 automated industrial intelligence tests pass cleanly:

```text
tests/test_industrial_assets.py .......... 4 passed (Seed, IP Lookup, Duplicate Rejection, Maintenance)
tests/test_industrial_scoring.py ......... 4 passed (Boundaries, Criticality vs Certainty, Uncertainty, Suppression)
tests/test_industrial_correlation.py ..... 4 passed (Cross-zone correlation, Out-of-order sorting, Dedup, Window separation)
tests/test_industrial_recommendations.py . 2 passed (Explainability facts/hypotheses, Human approval gates)
tests/test_industrial_api.py ............. 4 passed (Assets API, Alert assessment, Incident lifecycle, Scenarios A-F)

Total: 17 passed in 1.85s (100% pass rate)
```

To run the complete test suite locally:
```powershell
.\venv\Scripts\python.exe -m pytest backend/tests/test_industrial*.py
```

---
*Built for the AI Builder Cup 2026. Designed for resilient, explainable industrial cybersecurity.*
