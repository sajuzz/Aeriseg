-- Extend telemetry table with rule_name and dest_ip
ALTER TABLE telemetry ADD COLUMN rule_name TEXT;
ALTER TABLE telemetry ADD COLUMN dest_ip TEXT;

-- Index for performance on searches
CREATE INDEX idx_telemetry_rule_name ON telemetry(rule_name);
CREATE INDEX idx_telemetry_dest_ip ON telemetry(dest_ip);
