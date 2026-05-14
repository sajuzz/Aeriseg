-- Agents Table
CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT UNIQUE NOT NULL,
    hostname TEXT NOT NULL,
    ip_address TEXT,
    os_type TEXT, -- windows, linux, macos
    os_version TEXT,
    status TEXT DEFAULT 'ONLINE', -- ONLINE, OFFLINE, DISCONNECTED
    version TEXT,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed data removed for manual creation

