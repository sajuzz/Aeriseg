-- Enhanced Case Management Schema
ALTER TABLE investigations ADD COLUMN priority TEXT DEFAULT 'MEDIUM';
ALTER TABLE investigations ADD COLUMN assigned_to INTEGER;
ALTER TABLE investigations ADD COLUMN resolution_summary TEXT;
ALTER TABLE investigations ADD COLUMN evidence_metadata TEXT; -- JSON metadata

-- Investigation Notes (Threaded Comments)
CREATE TABLE IF NOT EXISTS investigation_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    investigation_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (investigation_id) REFERENCES investigations(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_notes_investigation ON investigation_notes(investigation_id);
