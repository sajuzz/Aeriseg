"""
Compliance service for mapping alerts and summarizing compliance framework events.
"""
from typing import Dict, List, Any, Optional

FRAMEWORK_INFO = {
    "HIPAA": {"name": "Health Insurance Portability and Accountability Act", "description": "Healthcare data privacy and security requirements"},
    "PCI-DSS": {"name": "Payment Card Industry Data Security Standard", "description": "Payment card data protection standard"},
    "GDPR": {"name": "General Data Protection Regulation", "description": "EU data privacy regulation"},
    "NIST": {"name": "NIST Cybersecurity Framework", "description": "Framework for improving critical infrastructure cybersecurity"}
}

def map_alert(alert_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Map alert details to potential compliance violations/events."""
    events = []
    rule_id = alert_data.get("rule_id", "")
    severity = alert_data.get("severity", "MEDIUM")
    
    if "hipaa" in rule_id.lower() or "patient" in str(alert_data).lower() or "phi" in str(alert_data).lower():
        events.append({
            "framework": "HIPAA",
            "control_id": "164.312(b)",
            "control_name": "Audit Controls",
            "severity": severity,
            "phi_involved": True,
            "breach_risk": severity in ("HIGH", "CRITICAL"),
            "status": "OPEN",
            "description": f"Potential HIPAA audit control event triggered by rule {rule_id}"
        })
    return events

def summarise(comp_events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Summarise compliance events by framework and breach risk."""
    summary: Dict[str, Any] = {
        "total_events": len(comp_events),
        "breach_risks": sum(1 for e in comp_events if e.get("breach_risk")),
        "by_framework": {}
    }
    for e in comp_events:
        fw = e.get("framework", "UNKNOWN")
        if fw not in summary["by_framework"]:
            summary["by_framework"][fw] = 0
        summary["by_framework"][fw] += 1
    return summary
