# 🛡️ AeriSeg SIEM+SOAR: Comprehensive Architecture & Build Stages

> **Current Document Version:** 1.0.0  
> **Repository:** `sajuzz/medishield` (AeriSeg Cyber Defense Grid)  
> **Environment:** Air-Gapped, Segmented, and Enterprise SOC Operations  

---

## Executive Summary

**AeriSeg** (originally evolved from the **MediShield** initiative) is an enterprise-grade **Security Operations Center (SOC) & Extended Detection and Response (XDR/SOAR)** platform. It is engineered specifically for **air-gapped, highly segmented, and mission-critical environments** (e.g., healthcare hospital networks, defense facilities, industrial control networks, and isolated data enclaves).

Unlike standard cloud-native SIEMs that rely heavily on persistent internet connectivity, heavy third-party SaaS pipelines, and complex microservice fabrics, AeriSeg is designed as a **resilient, modular monolith** capable of operating fully offline with ultra-low latency, zero external data leaks, and high-fidelity threat correlation.

---

## 1. System Architecture & Core Technology Stack

```
                                 ┌────────────────────────────────────────────────────────┐
                                 │                 TELEMETRY PRODUCERS                    │
                                 │  • Suricata IDS (EVE-JSON)  • Linux/Win Host Agents     │
                                 │  • Cloud & Syslog Collectors • SOC Attack Simulator    │
                                 └───────────────────────────┬────────────────────────────┘
                                                             │
                                                             ▼
                                 ┌────────────────────────────────────────────────────────┐
                                 │              INGESTION & BUFFERING LAYER               │
                                 │  • FastAPI Ingestion Endpoints (/api/ingest)           │
                                 │  • Real-time Suricata File Ingestor Provider           │
                                 │  • NATS JetStream Message Bus (Backpressure buffering) │
                                 └───────────────────────────┬────────────────────────────┘
                                                             │
                                                             ▼
                                 ┌────────────────────────────────────────────────────────┐
                                 │               DETECTION & CORRELATION                  │
                                 │  • Layer 1: ExactDedupFilter (Hash + sliding TTL)      │
                                 │  • Layer 2: CorrelationEngine & BucketStore            │
                                 │  • Rule Evaluator: YAML / MITRE ATT&CK Rules           │
                                 │  • TokenBucketLimiter & Alert Rate Controller          │
                                 │  • Background Detection Scheduler (APScheduler)        │
                                 └──────────────┬──────────────────────────┬──────────────┘
                                                │                          │
                                                ▼                          ▼
┌────────────────────────────────────────────────────────┐       ┌───────────────────────────────────────────┐
│                    STORAGE ENGINE                      │       │          REAL-TIME NOTIFICATIONS          │
│ • SQLite (aeriseg.db): Metadata, Users, Cases, Alerts  │       │ • WebSocket Server (/ws/telemetry)        │
│ • PostgreSQL: Multi-tenant relational storage (Docker) │       │ • Instant alert push, EPS sparkline pulse │
│ • Elasticsearch 8.x: Full-text logs via MovementPath   │       └─────────────────────┬─────────────────────┘
│ • ClickHouse: High-volume batch telemetry writer       │                             │
└────────────────────────────────────────────────────────┘                             │
                                                │                                      │
                                                └──────────────────┬───────────────────┘
                                                                   ▼
                                 ┌────────────────────────────────────────────────────────┐
                                 │              SOAR & ANALYST WORKBENCH (UI)             │
                                 │  • React 18 + Vite + Tailwind CSS v4                   │
                                 │  • Playbook Engine: Automated Response Actions         │
                                 │  • ASQL Query Engine: SQL & Elasticsearch Compiler     │
                                 │  • Case & Incident Management, Unified Timelines       │
                                 └────────────────────────────────────────────────────────┘
```

### Core Technologies

| Layer | Technology | Role & Capabilities |
| :--- | :--- | :--- |
| **Backend Core** | **Python 3.12+ / FastAPI** | Asynchronous, high-throughput REST API with native Pydantic typing and lifespan task management. |
| **Real-time Bus** | **NATS JetStream & WebSockets** | Zero-dependency messaging broker with backpressure management; bi-directional WebSockets for live UI updates. |
| **Persistence (Relational)** | **SQLite & PostgreSQL 15** | Serverless portable storage (`aeriseg.db`) for isolated setups; scalable multi-tenant PostgreSQL via Docker. |
| **Telemetry Analytics** | **Elasticsearch 8.x & ClickHouse** | Elasticsearch indexed via `MovementPath`; asynchronous batch ClickHouse logging (`ch_batch`) for 100k+ EPS workloads. |
| **Query Engine** | **ASQL (AeriSeg Query Language)** | Domain-specific query language that parses high-level analyst syntax into optimized SQL and Elasticsearch queries. |
| **Detection Engine** | **Multi-tier Correlation Engine** | Combines byte-level deduplication, windowed stateful correlation, threshold escalation, and rate-limiting. |
| **SOAR Automation** | **In-house Workflow Engine** | Automated trigger-to-action playbooks (conditions, python code sandboxes, approval gates, mock firewall connectors). |
| **Frontend UI/UX** | **React 18, Vite, Tailwind CSS v4** | Dark-themed, high-density SOC interface with sub-millisecond hot reloads, Lucide icons, and Recharts visualization. |

---

## 2. Completed Build Stages & Current Platform Capabilities

The project has advanced through several milestone stages, resulting in a production-ready SOC workstation:

### 🟢 Stage 1: Multi-Tenant Foundation & Security Data Modeling
- **Multi-Tenant Hierarchy:** Database-enforced isolation spanning Organizations, Tenants, and Segmented Enclaves.
- **Role-Based Access Control (RBAC):** Built-in user identity models supporting `ADMIN`, `SOC_MANAGER`, `L1_ANALYST`, `L2_ANALYST`, `THREAT_HUNTER`, `INCIDENT_RESPONDER`, `AUDITOR`, and `VIEWER`.
- **Relational Domain Models:**
  - `Alert`: Severity rating (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), lifecycle status (`NEW`, `ACKNOWLEDGED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED_FALSE_POSITIVE`), and source event tracking.
  - `Case`: Triaged SOC cases divided into Tier 1 (`L1`), Tier 2 (`L2`), and Tier 3 (`L3`) with SLA deadlines.
  - `Incident`: High-impact incidents linked to underlying cases and alert clusters.
  - `Timeline`: Granular audit trail capturing creation, updates, notes, and state transitions.
  - `ComplianceEvent`: Healthcare/Enterprise compliance tracking (HIPAA/PHI, Breach Risk analysis).

### 🟢 Stage 2: Telemetry Ingestion & Ingestion Pipeline
- **Multi-Source Ingestion Router (`/api/ingest`):** Handles batch and single-event payloads from sensors and agents.
- **Log Parsers:** Specialized parsers for Suricata IDS (EVE-JSON), Linux syslog and authentication logs, Cloud event logs, and generic application JSON.
- **Suricata Real-Time Ingestor:** Background thread provider that continuously tails and ingests IDS events directly into the pipeline.
- **MovementPath Engine:** Core routing abstraction that normalizes incoming logs into Elastic Common Schema (ECS), applies tenant isolation wrappers, and indexes batches into Elasticsearch.
- **Real-Time Streaming Bus:** WebSocket server broadcasting live telemetry counts, alerts, and campaign tracking directly to connected analyst browsers.

### 🟢 Stage 3: Two-Layer Detection & Intelligent Correlation
- **Layer 1 — Exact Duplicate Filter (`ExactDedupFilter`):**
  - High-speed hash-based fingerprinting with sliding TTL windows.
  - Instantly drops byte-identical event spikes caused by sensor retransmission or NATS redeliveries before invoking rule evaluation.
- **Layer 2 — Stateful Correlation & Throttling (`CorrelationEngine` & `BucketStore`):**
  - Groups related events by configurable correlation dimensions (e.g., `[source_ip, rule_id]` or `[source_ip, dest_ip]`).
  - Sliding time windows (e.g., 300s) with active suppression cooldowns (e.g., 900s) to prevent SOC queue flooding.
  - Escalation ladder: Automatically bumps alert severity (e.g., Medium to High) when sustained activity crosses escalation thresholds.
  - Memory protection via `TokenBucketLimiter` and capped evidence sample storage.
- **YAML Threat Detection Rules:** Declarative rules mapped to MITRE ATT&CK tactics and techniques (e.g., `MS-001` DICOM Mass Exfiltration, `MS-002` Brute Force Login).
- **Background Scheduler:** Autonomous background engine that evaluates periodic rule queries against the telemetry index every 60 seconds.

### 🟢 Stage 4: ASQL (AeriSeg Query Language) & Threat Hunting
- **Custom Security Query Abstraction:** Eliminates the need for analysts to construct complex raw SQL or Elasticsearch JSON queries.
- **AST Lexer, Tokenizer & Parser:** Parses human-readable security queries (e.g., `source_ip:10.0.0.5 AND severity:high`).
- **Dual Query Compiler:**
  - `compile_to_sql`: Transforms AST into parameterized SQL queries with column-aware filters and wildcard fallbacks.
  - `compile_to_es`: Transforms AST into Elasticsearch boolean query DSL (`term`, `match`, and `query_string`).
- **Interactive Threat Hunting Console:** Frontend hunt interface with query history, quick filters, and log drilldowns.

### 🟢 Stage 5: Incident Response, Case Management & Forensics
- **Tiered Case Workflows:** Auto-promotes critical detections into L1/L2/L3 cases with visual SLA trackers.
- **Incident Escalation:** Merges multiple correlated cases into major security incidents.
- **Forensic Investigation Workspace:**
  - Evidence artifact lockers supporting log files, network pcaps, and file hashes.
  - Collaborative case notes with author tagging.
  - Unified investigative timeline consolidating all actions, alerts, and state changes.
  - Graph-based correlation engine (`related_event_service`) identifying co-occurring IP and credential anomalies.

### 🟢 Stage 6: SOAR & Playbook Automation
- **Visual Playbook Designer:** Frontend graph/flow designer to build automated remediation workflows.
- **Workflow Execution Engine (`PlaybookEngine`):**
  - Supports multiple node execution types: `condition`, `python` sandboxes, `foreach` loops, and `while` loops.
  - Human-in-the-loop manual approval gates (`approval` nodes) that pause workflows until authorized by a SOC lead.
  - Connector ecosystem with sample automated containment actions (`LocalMockFirewallConnector` IP blocking).
  - Full execution tracking and historical logging via `PlaybookExecution` models.

### 🟢 Stage 7: Analyst Frontend (React + Vite + Tailwind CSS v4)
A cohesive, dark-themed SOC single-page application with 21 dedicated views:
1. **Global Dashboard (`Dashboard.jsx`):** Live EPS sparklines, severity breakdowns, segment heatmaps, and active threat pulse.
2. **Alert Queue (`Alerts.jsx`):** Filterable grid with instant status progression and triage shortcuts.
3. **Analyst Workbench (`AnalystWorkbench.jsx`):** Deep inspection interface for packet logs, rule metadata, and quick pivoting.
4. **Investigation Queue & Detail (`InvestigationQueue.jsx`, `InvestigationDetail.jsx`):** Case management hub with evidence attachments and notes.
5. **Incidents Center (`Incidents.jsx`):** High-level overview of active incident cases and SLA metrics.
6. **Threat Hunt Console (`ThreatHunt.jsx`):** ASQL query terminal and live log explorer.
7. **Attack Timeline (`AttackTimeline.jsx`):** Interactive visual timeline tracking threat actor lateral movement.
8. **Attack Simulator (`AttackSimulator.jsx`):** One-click trigger for live attack simulations.
9. **Asset & Agent Management (`Assets.jsx`, `Agents.jsx`):** Endpoint telemetry inventory and agent health monitoring.
10. **Rule Management & Rule Builder (`Rules.jsx`, `RuleBuilder.jsx`):** Catalog and visual editor for YAML detection logic.
11. **Playbook Designer (`PlaybookDesigner.jsx`):** Workflow canvas for SOAR response sequences.
12. **Administration & Identity (`Users.jsx`, `Settings.jsx`, `DataSources.jsx`, `Documentation.jsx`, `Login.jsx`, `CustomDashboards.jsx`).

### 🟢 Stage 8: SOC Simulator, Bootstrapping & Deployment Environment
- **Integrated SOC Attack Simulator (`demo_manager.py` / `event_generator.py`):**
  - Generates realistic benign baseline traffic interspersed with malicious attack sequences (SSH brute force, PACS exfiltration, SMB lateral movement).
  - Can be toggled on/off on demand via `ENABLE_MOCKS` environment variable or web UI.
- **One-Command Bootstrapper (`start.py`):** Starts FastAPI, migrates schemas, seeds users/dashboards, and launches Vite frontend in parallel.
- **Docker Compose Stack (`docker-compose.yml`):** Multi-container deployment orchestrating PostgreSQL 15, Elasticsearch 8.10.2, Backend, and Frontend.

---

## 3. Directory & Component Anatomy

```text
siem/
├── backend/
│   ├── app/
│   │   ├── alerts/               # Alert models, statuses, and routing
│   │   ├── api/                  # 15 modular REST API routers
│   │   ├── core/                 # Config, scheduler, demo manager
│   │   ├── database/ & db/       # SQLAlchemy engine, Elasticsearch client, ClickHouse batching
│   │   ├── detection/            # Layer 1 dedup, Layer 2 correlation, rule schemas, rate limiters
│   │   ├── identity/             # Users, authentication, and RBAC
│   │   ├── incidents/            # Incidents, Cases, CaseNotes, and Timelines
│   │   ├── mock/                 # Attack scenario and mock event generators
│   │   ├── models/               # SQLAlchemy definitions (DetectionRule, Playbook, Compliance)
│   │   ├── movement_path/        # ECS routing, multi-tenant indexing, and ES search
│   │   ├── parsers/              # Log parsers (Suricata, Linux, Cloud)
│   │   ├── providers/            # Real-time data providers (Suricata EVE tailer, firewalls)
│   │   ├── query/                # ASQL tokenizer, parser, and SQL/ES compilers
│   │   ├── services/             # 20 business logic services (SOC, compliance, threat hunt, etc.)
│   │   ├── soar/                 # Playbook execution engine, policies, and firewall connectors
│   │   ├── tenants/              # Organization and tenant data models
│   │   ├── websocket/            # Live telemetry WebSocket broadcast server
│   │   └── main.py               # FastAPI application lifecycle and startup hooks
│   └── requirements.txt          # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/           # High-density SOC widgets, charts, and modal panels
│   │   ├── layouts/              # SidebarLayout with persistent navigation and socket status
│   │   ├── pages/                # 21 operational SOC views (Dashboard, Alerts, Playbooks, etc.)
│   │   ├── store/ & stores/      # Zustand state stores (useSocStore, useAuthStore)
│   │   ├── App.jsx               # Client-side routing and WebSocket listeners
│   │   └── index.css             # Tailwind CSS v4 styling & dark-theme design tokens
│   ├── package.json              # Frontend npm dependencies
│   └── vite.config.js            # Vite configuration
├── detection-rules/              # YAML detection rule definitions with correlation specs
├── agents/                       # Endpoint collectors (Linux, Windows, Suricata, Cloud)
├── docs/                         # Technical deep dives, setup instructions, and deployment guides
├── docker-compose.yml            # Containerized PostgreSQL, Elasticsearch, Backend, Frontend
├── start.py                      # Master cross-platform development startup script
└── aeriseg.db                    # Active SQLite database for self-contained air-gapped run
```

---

## 4. Current Stage Summary & Next Roadmap Milestones

### Current Stage Status: **Enterprise Pilot & Functional SOC MVP**
The application currently functions as a complete, self-contained, air-gapped SIEM and lightweight SOAR. Analysts can ingest data, inspect live streaming feeds, formulate ASQL queries, triage alerts through correlation buckets, escalate incidents through an L1-L3 tiering framework, execute response playbooks, and simulate active adversary campaigns.

### Next Roadmap Milestones:
1. **High-Throughput ClickHouse Telemetry Cluster:** Transition ingestion storage to distributed ClickHouse nodes for sustained 50,000+ EPS workloads in large campus deployments.
2. **Native Rust Sensor Agents:** Package lightweight native binary collectors from `agents/` for Windows and Linux endpoints with mutual TLS authentication.
3. **Sigma & YARA Automated Rule Ingestion:** Pipeline to import community Sigma rules directly into ASQL and Elasticsearch query targets.
4. **Enterprise Identity Federation:** Active Directory, LDAP, and SAML 2.0 single sign-on integration for multi-analyst shift coordination.
5. **Bidirectional SOAR Connectors:** Expand playbook actions with Palo Alto PAN-OS, Cisco ASA, and Active Directory quarantine integrations.

---
*Generated for the AeriSeg Cyber Defense Grid repository.*
