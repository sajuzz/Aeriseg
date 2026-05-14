-- Investigation Evidence Locker
CREATE TABLE IF NOT EXISTS investigation_artifacts (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL,
    artifact_type TEXT NOT NULL, -- 'SCREENSHOT', 'PCAP_SNIPPET', 'LOG_FILE'
    file_path TEXT,
    content TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(investigation_id) REFERENCES investigations(id)
);
