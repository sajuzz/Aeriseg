-- Alert Confidence & Enrichment
ALTER TABLE alerts ADD COLUMN confidence_score INTEGER DEFAULT 0;
ALTER TABLE alerts ADD COLUMN raw_payload TEXT; -- For Packet Drilldown
