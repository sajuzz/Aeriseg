CREATE TABLE IF NOT EXISTS investigation_actions (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_value TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING', -- PENDING, EXECUTED, FAILED
    notes TEXT,
    actor TEXT,
    result_metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (investigation_id) REFERENCES investigations(id)
);

CREATE INDEX IF NOT EXISTS idx_actions_investigation ON investigation_actions(investigation_id);
