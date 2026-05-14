# 🧠 AeriSeg Technical Deep Dive

This document provides a professional, deep-level understanding of the architecture, design decisions, and engineering principles behind the AeriSeg SIEM platform.

---

## 🏗️ 1. System Architecture Overview

AeriSeg follows a **Modular Monolith** architecture, designed for reliability in air-gapped environments where microservice complexity can be a liability.

### High-Level Data Flow:
1.  **Ingestion**: Telemetry is collected via `Suricata` (IDS), `AeriSeg Agents`, or the `Background Simulator`.
2.  **Buffering**: Data is streamed through a **NATS** message broker (internal/external) to ensure backpressure management.
3.  **Normalization**: The `Normalizer Service` converts raw logs into a standardized JSON format.
4.  **Detection**: The `Detection Engine` evaluates normalized events against YAML rules.
5.  **Persistence**: Alerts and metadata are stored in `SQLite` (for the prototype) and `ClickHouse` (intended for high-scale telemetry).
6.  **Presentation**: The `FastAPI` backend serves the data via REST and WebSockets to the `React` frontend.

---

## ⚡ 2. The ASQL Engine (AeriSeg Query Language)

ASQL is a domain-specific abstraction layer that simplifies complex security queries.

### Why ASQL?
Security analysts shouldn't have to write raw SQL joins to find threats across network segments. ASQL provides a human-readable interface:
*   **Segment-Aware**: Automatically filters by network boundaries.
*   **Time-Relative**: Uses intuitive windows like `LAST 15m` or `SINCE yesterday`.
*   **Pivoting**: Designed for easy "drill-down" from an alert to its source telemetry.

**Technical Implementation**:
The ASQL engine (located in `backend/app/detection/engine.py`) uses a grammar-based parser to translate high-level security queries into optimized SQLite/ClickHouse queries.

---

## 📡 3. Real-time Synchronization (WebSockets & NATS)

AeriSeg maintains a "Living Dashboard" through two main channels:
1.  **NATS**: Handles the high-volume backend data bus. It allows for decoupled ingestion where the backend doesn't need to wait for the database to finish writing before acknowledging an event.
2.  **WebSockets**: The `WS Server` (in `backend/app/websocket/server.py`) pushes critical updates (like new alerts) directly to the browser. This eliminates the need for expensive polling and reduces the server load.

---

## 🧪 4. The SOC Simulator (Demo Mode)

A unique feature of AeriSeg is the **Integrated SOC Simulator**.
*   **Purpose**: Allows for instant demonstrations, training, and testing of detection rules without a live malware outbreak.
*   **Mechanism**: A background thread (`backend/app/core/demo_manager.py`) generates statistically realistic telemetry, including "noise" and "signal" (attack patterns).
*   **Control**: Can be toggled via the `ENABLE_MOCKS` environment variable.

---

## 📈 5. Scalability & Future-Proofing

While the current prototype uses SQLite for ease of deployment, the architecture is designed to scale:
*   **Database Switching**: The `TelemetryRepository` pattern allows for swapping SQLite for **ClickHouse** with minimal code changes.
*   **Agent Deployment**: The system is ready for the `AeriSeg Agent`, a lightweight Rust-based collector designed for edge-device monitoring.
*   **Auth Expansion**: Currently using a simplified JWT flow, but ready for integration with LDAP/Active Directory for enterprise use.

---

## 🛠️ 6. Core Technology Choices (The "Why")

*   **FastAPI**: Chosen for its native support for asynchronous programming, which is critical for handling high-volume telemetry without blocking the UI.
*   **React + Tailwind**: Allows for a "Single Pane of Glass" experience where thousands of data points are rendered efficiently without UI lag.
*   **YAML Rules**: We use YAML for detection rules because it is human-readable, version-control friendly, and can be easily edited by analysts without programming knowledge.

---

*AeriSeg: Engineering Security for the Invisible Network.*
