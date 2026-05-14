import re

OWASP_RULES = [
    {
        "name": "SQL Injection Attempt (UNION SELECT)",
        "pattern": re.compile(r"(?i)union.*select"),
        "severity": "CRITICAL",
        "mitre_tactic": "Initial Access",
        "mitre_technique": "T1190"
    },
    {
        "name": "Cross-Site Scripting (XSS)",
        "pattern": re.compile(r"(?i)<script>|%3Cscript%3E"),
        "severity": "HIGH",
        "mitre_tactic": "Initial Access",
        "mitre_technique": "T1190"
    },
    {
        "name": "Path Traversal",
        "pattern": re.compile(r"(?i)\.\./\.\./|%2E%2E%2F"),
        "severity": "CRITICAL",
        "mitre_tactic": "Credential Access",
        "mitre_technique": "T1552"
    },
    {
        "name": "SSH Brute Force",
        "pattern": re.compile(r"(?i)failed password"),
        "severity": "HIGH",
        "mitre_tactic": "Credential Access",
        "mitre_technique": "T1110"
    }
]
