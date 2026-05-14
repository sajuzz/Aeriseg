CREATE TABLE IF NOT EXISTS telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT UNIQUE,
    timestamp TEXT NOT NULL,
    source TEXT,
    event_type TEXT,
    source_ip TEXT,
    raw_log TEXT,
    severity TEXT
);

CREATE INDEX IF NOT EXISTS idx_telemetry_event_id ON telemetry(event_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry(timestamp);

CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id TEXT UNIQUE,
    timestamp TEXT NOT NULL,
    rule_name TEXT,
    severity TEXT,
    source_ip TEXT,
    mitre_tactic TEXT,
    mitre_technique TEXT,
    raw_event TEXT
);

CREATE TABLE IF NOT EXISTS query_audit (
    id TEXT PRIMARY KEY,
    query TEXT,
    execution_time_ms INTEGER,
    result_count INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
