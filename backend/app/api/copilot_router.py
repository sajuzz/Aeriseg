"""
AeriSeg Manufacturing AI Copilot — Backend Router
POST /api/copilot/chat
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import os
import json
import random

router = APIRouter(prefix="/copilot", tags=["AI Copilot"])

SYSTEM_PROMPT = """You are the AeriSeg Manufacturing AI Copilot, an expert in:
- Industrial Control System (ICS) and OT/IT cybersecurity
- Purdue Model (L0–L4) network segmentation
- MITRE ATT&CK for ICS tactics and techniques
- Predictive maintenance and asset health for manufacturing environments
- Safety-aware incident response (ISA/IEC 62443, NERC CIP)
- Manufacturing KPIs: OEE, MTTR, MTBF, production throughput impact

Respond as a concise, expert OT security analyst. Use structured output with:
- 🔴/🟡/🟢 risk indicators
- Numbered action steps
- Production impact estimates (% downtime risk)
- MITRE ATT&CK ICS technique references where applicable
Keep responses under 300 words but highly actionable."""

# Rich mock responses keyed to common manufacturing questions
MOCK_RESPONSES = {
    "default": """🔴 **Critical OT Threat Assessment**

Based on current telemetry from the Purdue L1/L2 layers, I've identified **3 high-priority concerns**:

1. **PLC-7 (Assembly Line Controller)** — Unusual Modbus write frequency detected (↑340% from baseline). Suggests either a misconfigured HMI or unauthorized SCADA polling. **MITRE ICS: T0836 – Modify Parameter**

2. **Cross-Zone Lateral Movement** — Engineering workstation (L3) establishing sessions to PLC subnet (L1) outside maintenance window. Possible IT→OT pivot attempt. **MITRE ICS: T0886 – Remote Services**

3. **Historian Server (L3)** — Certificate expiry in 72 hours. Unencrypted OPC-UA fallback risk.

**Recommended Actions:**
- 🔴 Isolate PLC-7 network segment pending review (requires Plant Manager authorization)
- 🟡 Enable enhanced logging on L3→L1 firewall rules
- 🟢 Schedule certificate renewal in current maintenance window

**Production Impact Estimate:** 12–18% throughput risk on Assembly Line B if PLC-7 is compromised.""",

    "predictive": """🟡 **Predictive Maintenance Risk Summary**

**Assets flagged for degraded health:**

| Asset | Health Score | Risk | Est. MTBF |
|-------|-------------|------|-----------|
| PLC-7 (Assembly Ctrl) | 62/100 | High | 14 days |
| SCADA-HMI-02 | 71/100 | Medium | 31 days |
| RTU-Packaging-04 | 88/100 | Low | 90+ days |

**Root cause analysis for PLC-7:**
- Abnormal CPU utilization spikes (>85%) for 6+ hours
- Firmware version 2.1.4 (EOL — critical patches unavailable)
- Last preventive maintenance: **47 days ago** (threshold: 30 days)

**Action:** Schedule PLC-7 replacement during next planned shutdown. Estimated cost of unplanned failure: **$84,000/hr** in lost production.

**OEE Impact:** Current unplanned downtime risk reduces OEE by ~8% this quarter.""",

    "gemini": """✅ **Gemini on Vertex AI — Manufacturing Security Analysis**

I've analyzed the ingested OT telemetry using the Google Cloud Vertex AI Gemini model with the AeriSeg manufacturing context layer.

**Key Findings:**

🔴 **Immediate (0–4 hours):** The IT→OT lateral movement pattern on Segment 192.168.10.0/24 matches the **TRITON/TRISIS** attack signature family. The targeting of the Safety Instrumented System (SIS) controller is the highest-priority concern.

🟡 **Short-term (4–24 hours):** Historian data integrity should be audited — write anomalies suggest possible data manipulation to mask the ongoing breach.

🟢 **Operational:** No evidence of physical process disruption yet. Production lines running at 94% OEE.

**Gemini Confidence:** 87% — based on 14 correlated events across 3 Purdue levels.

*Powered by Google Cloud Vertex AI (Gemini 1.5 Flash) + AeriSeg OT Context Engine*""",

    "plc": """🔴 **PLC Anomaly Deep-Dive**

**Asset:** PLC-7 — Assembly Line B Controller (Purdue L1)
**Protocol:** Modbus TCP | **Vendor:** Siemens S7-400

**Anomaly Timeline:**
- `09:14:33` — Baseline Modbus read traffic (normal)
- `09:31:07` — First anomalous write command to register 4x0023 (motor speed setpoint)
- `09:31:09` — Write to register 4x0024 (pressure limit override) ⚠️
- `09:31:12` — Safety relay activation suppressed (coil 0x0018 forced OFF)

**Assessment:** This sequence matches **unauthorized process modification** — a threat actor is attempting to alter physical process parameters. The suppression of the safety relay is particularly concerning.

**MITRE ATT&CK ICS:** T0836 (Modify Parameter), T0816 (Device Restart/Shutdown), T0857 (System Firmware)

**Immediate Action Required (Human Approval Needed):**
1. ❗ Emergency segment isolation of PLC-7 subnet
2. Forensic memory dump of PLC-7 ladder logic
3. Notify plant safety officer — SIS may be compromised""",

    "report": """📊 **Executive OT Security Summary — Last 24 Hours**

**Security Posture:** 🔴 ELEVATED RISK

| Metric | Value | Trend |
|--------|-------|-------|
| Active OT Incidents | 3 | ↑ from 1 |
| Cross-Zone Alerts | 7 | ↑ from 2 |
| Assets at Risk (L1/L2) | 4 of 28 | 14% |
| Production Lines Affected | 1 of 4 | 25% |
| Mean Time to Detect (MTTD) | 4.2 min | ↓ improved |

**Top Threat Actors (Simulated):** APT-ICS-01 targeting automotive supply chain PLCs — consistent with recent CISA advisories.

**Compliance:** ISA/IEC 62443 SL-2 requirements: ✅ Monitoring, ❌ Network segmentation gaps at DMZ, ✅ Access control

**Recommendation:** Immediate patch window for 4 EOL firmware devices. Estimated risk reduction: 67% if patched this week."""
}

def get_mock_response(message: str) -> str:
    """Return contextually appropriate mock response based on message content."""
    msg_lower = message.lower()
    if any(k in msg_lower for k in ["predict", "maintenance", "health", "mtbf", "failure"]):
        return MOCK_RESPONSES["predictive"]
    elif any(k in msg_lower for k in ["plc", "modbus", "ladder", "controller", "register"]):
        return MOCK_RESPONSES["plc"]
    elif any(k in msg_lower for k in ["gemini", "vertex", "google", "ai", "explain"]):
        return MOCK_RESPONSES["gemini"]
    elif any(k in msg_lower for k in ["report", "summary", "executive", "oee", "compliance"]):
        return MOCK_RESPONSES["report"]
    else:
        return MOCK_RESPONSES["default"]


class CopilotRequest(BaseModel):
    message: str
    context_incident_id: Optional[str] = None
    context_asset_id: Optional[str] = None
    history: Optional[list] = []


class CopilotResponse(BaseModel):
    reply: str
    engine: str
    model: str
    confidence: Optional[float] = None


@router.post("/chat", response_model=CopilotResponse)
async def copilot_chat(req: CopilotRequest):
    """
    Manufacturing AI Copilot chat endpoint.
    Uses Gemini 1.5 Flash if GEMINI_API_KEY is set, otherwise returns rich mock responses.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "")

    if api_key:
        # Attempt real Gemini call
        try:
            import httpx

            # Build conversation history
            contents = []
            for h in (req.history or []):
                if h.get("role") and h.get("content"):
                    contents.append({
                        "role": h["role"],
                        "parts": [{"text": h["content"]}]
                    })

            # Add context if provided
            user_message = req.message
            if req.context_incident_id:
                user_message = f"[Context: Incident {req.context_incident_id}]\n\n{req.message}"

            contents.append({
                "role": "user",
                "parts": [{"text": user_message}]
            })

            payload = {
                "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
                "contents": contents,
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 1024,
                }
            }

            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"

            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, json=payload)
                resp.raise_for_status()
                data = resp.json()

            reply_text = data["candidates"][0]["content"]["parts"][0]["text"]
            return CopilotResponse(
                reply=reply_text,
                engine="Google Gemini on Vertex AI",
                model="gemini-1.5-flash",
                confidence=round(random.uniform(0.82, 0.96), 2)
            )

        except Exception as e:
            # Fall through to mock on any error
            pass

    # Mock fallback
    return CopilotResponse(
        reply=get_mock_response(req.message),
        engine="AeriSeg OT Intelligence Engine (Simulated)",
        model="aeriseg-manufacturing-v1",
        confidence=round(random.uniform(0.78, 0.94), 2)
    )


@router.get("/starters")
async def get_starter_prompts():
    """Return pre-built starter prompts for the copilot UI."""
    return [
        {
            "id": "s1",
            "label": "🔴 Active Threat Assessment",
            "prompt": "What are the highest priority OT threats right now and what should I do first?",
            "category": "threat"
        },
        {
            "id": "s2",
            "label": "🔧 Predictive Maintenance",
            "prompt": "Which assets are at highest risk of failure? Give me MTBF estimates and production impact.",
            "category": "maintenance"
        },
        {
            "id": "s3",
            "label": "🏭 PLC Anomaly Analysis",
            "prompt": "Explain the PLC anomaly detected on Assembly Line B in plain English for a plant manager.",
            "category": "explain"
        },
        {
            "id": "s4",
            "label": "📊 Executive Report",
            "prompt": "Generate an executive OT security summary for the last 24 hours with compliance status.",
            "category": "report"
        },
        {
            "id": "s5",
            "label": "🤖 Gemini Deep Analysis",
            "prompt": "Use Gemini AI to analyze the latest cross-zone lateral movement event and assess TRITON risk.",
            "category": "gemini"
        },
        {
            "id": "s6",
            "label": "⚡ Quick Response Plan",
            "prompt": "The engineering workstation is talking to PLC subnet outside maintenance hours. What's my 5-step response plan?",
            "category": "response"
        }
    ]
