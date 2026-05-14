-- System Configuration Table
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Initialize Demo Mode as OFF
INSERT OR IGNORE INTO system_config (key, value) VALUES ('DEMO_MODE', 'false');
