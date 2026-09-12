-- 018_alert_events_mapping.sql

-- Table to map an alert to the raw events that triggered it (aggregate alert container)
CREATE TABLE IF NOT EXISTS alert_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id INTEGER NOT NULL,
    event_id TEXT NOT NULL,
    mapped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(alert_id) REFERENCES alerts(id) ON DELETE CASCADE
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_alert_events_alert_id ON alert_events(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_events_event_id ON alert_events(event_id);

-- Add rule_version to alerts table
ALTER TABLE alerts ADD COLUMN rule_version TEXT DEFAULT '1.0';
