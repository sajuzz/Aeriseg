-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'ANALYST', -- ADMIN, ANALYST, VIEWER
    full_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Update Alerts to track triaging
ALTER TABLE alerts ADD COLUMN assigned_to INTEGER REFERENCES users(id);
ALTER TABLE alerts ADD COLUMN resolved_by INTEGER REFERENCES users(id);

-- Update Investigations to track ownership
ALTER TABLE investigations ADD COLUMN owner_id INTEGER REFERENCES users(id);

-- Audit Log for User Actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    target_type TEXT, -- ALERT, INVESTIGATION, RULE, USER
    target_id TEXT,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Seed an admin user (password: admin123 - hashed version for demo)
-- Note: In a real app, we'd use bcrypt. For this POC, we'll use a simple hash or plain text initially if needed, 
-- but I'll implement a proper verify_password logic.
INSERT OR IGNORE INTO users (username, password_hash, role, full_name) 
VALUES ('admin', 'pbkdf2:sha256:600000$admin123_salt$admin_hash_placeholder', 'ADMIN', 'System Administrator');
