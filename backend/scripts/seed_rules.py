import sqlite3
import json

db_path = 'C:\\Users\\SJ\\Desktop\\projects\\siem\\aeriseg.db'

rules = [
    {
        "id": "MS-001",
        "name": "SSH Brute Force",
        "description": "Detects multiple failed SSH login attempts",
        "severity": "medium",
        "risk_weight": 25,
        "mitre_tactic": "Credential Access",
        "mitre_technique": "T1110.001",
        "rule_type": "query",
        "query_json": json.dumps({"event_type": "auth_failure"}),
        "window_secs": 60,
        "threshold": 5,
        "enabled": 1
    },
    {
        "id": "MS-002",
        "name": "Privilege Escalation",
        "description": "Detects multiple failed sudo attempts",
        "severity": "high",
        "risk_weight": 35,
        "mitre_tactic": "Privilege Escalation",
        "mitre_technique": "T1068",
        "rule_type": "query",
        "query_json": json.dumps({"event_type": "auth_failure", "process": "sudo"}),
        "window_secs": 120,
        "threshold": 3,
        "enabled": 1
    },
    {
        "id": "NW-001",
        "name": "Port Scan",
        "description": "Detects network port scanning activity",
        "severity": "medium",
        "risk_weight": 30,
        "mitre_tactic": "Discovery",
        "mitre_technique": "T1046",
        "rule_type": "suricata",
        "query_json": json.dumps({"source": "suricata", "raw_log.alert.signature": "scan"}),
        "window_secs": 60,
        "threshold": 1,
        "enabled": 1
    },
    {
        "id": "NW-002",
        "name": "SQL Injection",
        "description": "Detects SQL injection attempts in network traffic",
        "severity": "critical",
        "risk_weight": 40,
        "mitre_tactic": "Initial Access",
        "mitre_technique": "T1190",
        "rule_type": "suricata",
        "query_json": json.dumps({"source": "suricata", "raw_log.alert.signature": "sql"}),
        "window_secs": 60,
        "threshold": 1,
        "enabled": 1
    },
    {
        "id": "NW-003",
        "name": "Suspicious DNS",
        "description": "Detects suspicious DNS queries",
        "severity": "low",
        "risk_weight": 30,
        "mitre_tactic": "Command and Control",
        "mitre_technique": "T1071.004",
        "rule_type": "suricata",
        "query_json": json.dumps({"source": "suricata", "raw_log.dns.type": "answer"}),
        "window_secs": 60,
        "threshold": 10,
        "enabled": 1
    }
]

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Clear existing rules
cursor.execute("DELETE FROM detection_rules")

for r in rules:
    cursor.execute("""
        INSERT INTO detection_rules (id, name, description, severity, risk_weight, mitre_tactic, mitre_technique, rule_type, query_json, window_secs, threshold, enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (r["id"], r["name"], r["description"], r["severity"], r["risk_weight"], r["mitre_tactic"], r["mitre_technique"], r["rule_type"], r["query_json"], r["window_secs"], r["threshold"], r["enabled"]))

conn.commit()
conn.close()
print(f"Seeded {len(rules)} rules.")
