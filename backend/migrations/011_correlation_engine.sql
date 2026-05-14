-- Correlation Engine Schema
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    risk_score INTEGER DEFAULT 0,
    source_ip TEXT,
    mitre_tactics TEXT, -- Comma separated
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    alert_ids TEXT -- JSON array of alert IDs
);

CREATE INDEX idx_campaigns_source ON campaigns(source_ip);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- Update alerts table to link to campaigns
ALTER TABLE alerts ADD COLUMN campaign_id TEXT;
