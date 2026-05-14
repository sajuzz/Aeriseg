-- Expand Asset Metadata
ALTER TABLE assets ADD COLUMN os TEXT;
ALTER TABLE assets ADD COLUMN environment TEXT;
ALTER TABLE assets ADD COLUMN business_unit TEXT;
