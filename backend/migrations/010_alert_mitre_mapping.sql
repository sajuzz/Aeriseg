-- Add MITRE ATT&CK mapping to alerts table
ALTER TABLE alerts ADD COLUMN mitre_technique TEXT;
ALTER TABLE alerts ADD COLUMN mitre_tactic TEXT;

-- Index for threat intelligence pivoting
CREATE INDEX idx_alerts_mitre ON alerts(mitre_technique);
