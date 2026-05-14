import re

# Advanced Rule Structure
# match: dict of exact field matches (LOWER case)
# contains: list of strings that must be in a specific field
# regex: regex to run on raw_log
# threshold: (optional) count and seconds
# group_by: (optional) fields to group by for threshold

DETECTION_RULES = [
    # ─── Network IDS (Suricata) Mappings ─────────────────────────────────────
    {
        "id": "SURICATA_SQLI",
        "title": "SQL Injection Activity (Suricata)",
        "severity": "CRITICAL",
        "match": {"source": "suricata"},
        "contains": {"rule_name": ["sql injection", "sqlmap", "union select"]},
        "mitre_tactic": "Initial Access",
        "mitre_technique": "T1190",
        "threshold": {"count": 3, "seconds": 60},
        "group_by": ["source_ip"]
    },
    {
        "id": "SURICATA_SCAN",
        "title": "Network Reconnaissance (Suricata)",
        "severity": "MEDIUM",
        "match": {"source": "suricata"},
        "contains": {"rule_name": ["nmap", "portscan", "reconnaissance"]},
        "mitre_tactic": "Reconnaissance",
        "mitre_technique": "T1595",
        "threshold": {"count": 10, "seconds": 300},
        "group_by": ["source_ip"]
    },

    # ─── Generic Web / Application Attacks ───────────────────────────────────
    {
        "id": "GENERIC_SQLI",
        "title": "Generic SQL Injection Pattern",
        "severity": "HIGH",
        "regex": re.compile(r"(?i)union.*select|information_schema|waitfor delay"),
        "mitre_tactic": "Initial Access",
        "mitre_technique": "T1190"
    },
    {
        "id": "GENERIC_XSS",
        "title": "Cross-Site Scripting (XSS)",
        "severity": "MEDIUM",
        "regex": re.compile(r"(?i)<script>|%3Cscript%3E|onerror=|onload="),
        "mitre_tactic": "Initial Access",
        "mitre_technique": "T1190"
    },
    {
        "id": "SSH_BRUTE_FORCE",
        "title": "Brute Force Attempt (SSH)",
        "severity": "HIGH",
        "regex": re.compile(r"(?i)failed password|authentication failure"),
        "mitre_tactic": "Credential Access",
        "mitre_technique": "T1110",
        "threshold": {"count": 5, "seconds": 300},
        "group_by": ["source_ip"]
    },

    # ─── OT / Healthcare Specialized ─────────────────────────────────────────
    {
        "id": "HL7_ANOMALY",
        "title": "Medical Device Protocol Anomaly",
        "severity": "CRITICAL",
        "match": {"source": "hl7"},
        "contains": {"message": ["malformed", "invalid msh"]},
        "mitre_tactic": "Impact",
        "mitre_technique": "T1496"
    },
    {
        "id": "MODBUS_UNAUTHORIZED_WRITE",
        "title": "Unauthorized PLC Write Command",
        "severity": "CRITICAL",
        "match": {"source": "modbus"},
        "contains": {"function_code": ["write", "force"]},
        "mitre_tactic": "Impact",
        "mitre_technique": "T0836"
    }
]
