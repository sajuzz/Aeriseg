-- Custom Dashboards
CREATE TABLE IF NOT EXISTS custom_dashboards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    refresh_interval INTEGER DEFAULT 60,   -- seconds
    layout_json TEXT,                      -- grid layout config
    created_by TEXT DEFAULT 'local_analyst',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Dashboard Widgets
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dashboard_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    widget_type TEXT NOT NULL,             -- stat, line, bar, pie, table
    mql_query TEXT NOT NULL,
    visualization_config TEXT,             -- JSON config (colors, axes, etc.)
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 4,
    height INTEGER DEFAULT 3,
    refresh_interval INTEGER DEFAULT 60,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(dashboard_id) REFERENCES custom_dashboards(id) ON DELETE CASCADE
);

-- Cache for performance
CREATE TABLE IF NOT EXISTS dashboard_cache (
    widget_id INTEGER PRIMARY KEY,
    cached_result TEXT,
    generated_at DATETIME,
    expires_at DATETIME,
    FOREIGN KEY(widget_id) REFERENCES dashboard_widgets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dashboards_created ON custom_dashboards(created_at DESC);
