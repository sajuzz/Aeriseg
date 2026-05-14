CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hostname TEXT,
    ip_address TEXT,
    asset_type TEXT,
    owner TEXT,
    department TEXT,
    criticality TEXT,
    vendor TEXT,
    model TEXT,
    location TEXT,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assets_ip ON assets(ip_address);
CREATE INDEX IF NOT EXISTS idx_assets_hostname ON assets(hostname);
