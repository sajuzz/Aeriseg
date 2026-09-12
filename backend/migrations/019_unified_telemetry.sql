-- Add missing columns to telemetry table to support the unified schema
ALTER TABLE telemetry ADD COLUMN hostname TEXT;
ALTER TABLE telemetry ADD COLUMN username TEXT;
ALTER TABLE telemetry ADD COLUMN destination_ip TEXT;
ALTER TABLE telemetry ADD COLUMN metadata TEXT;

-- We already added dest_ip in 009, but schema requires destination_ip.
-- Since SQLite doesn't support easy column rename or drop, we add it explicitly.
-- We can also backfill if needed, but for now just adding columns.
