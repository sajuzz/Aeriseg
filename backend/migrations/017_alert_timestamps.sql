-- 017_alert_timestamps.sql

-- Add occurred_at and ingested_at to the alerts table
ALTER TABLE alerts ADD COLUMN occurred_at TEXT;
ALTER TABLE alerts ADD COLUMN ingested_at TEXT;

-- Backfill existing alerts using first_seen
UPDATE alerts SET occurred_at = first_seen, ingested_at = first_seen WHERE occurred_at IS NULL;

-- Make occurred_at NOT NULL (SQLite doesn't support ALTER TABLE ... NOT NULL easily without recreation, 
-- but we can just rely on the app to enforce it going forward for simplicity, 
-- or we can recreate the table. Let's just rely on the application for the constraint to avoid complex table recreation)
