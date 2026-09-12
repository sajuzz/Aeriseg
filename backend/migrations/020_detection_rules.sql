-- 020_detection_rules.sql

CREATE TABLE IF NOT EXISTS detection_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    severity TEXT DEFAULT 'medium',
    risk_weight INTEGER DEFAULT 0,
    mitre_tactic TEXT,
    mitre_technique TEXT,
    rule_type TEXT DEFAULT 'query',
    query_json TEXT NOT NULL,
    window_secs INTEGER DEFAULT 0,
    threshold INTEGER DEFAULT 1,
    enabled BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
