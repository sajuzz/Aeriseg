DROP TABLE IF EXISTS alerts;
CREATE TABLE IF NOT EXISTS alerts (

    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id TEXT NOT NULL,
    title TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT DEFAULT 'OPEN',

    source_event_id TEXT,
    source_ip TEXT,
    host TEXT,

    dedup_key TEXT,
    dedup_count INTEGER DEFAULT 1,

    investigation_id TEXT,
    assigned_to INTEGER,

    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,

    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,

    raw_payload TEXT
);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_dedup ON alerts(dedup_key);
