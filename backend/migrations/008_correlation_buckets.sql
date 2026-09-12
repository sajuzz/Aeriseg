-- backend/migrations/008_correlation_buckets.sql
--
-- NOTE: BucketStore.init() creates this table automatically with
-- CREATE TABLE IF NOT EXISTS, so this migration is redundant if you
-- only ever run through bucket_store.py. It is provided here so the
-- schema is visible in your existing /migrations history and tracked
-- alongside your other schema changes (e.g. 007_users_and_audit.sql).

CREATE TABLE IF NOT EXISTS alert_buckets (
    key                     TEXT PRIMARY KEY,
    rule_id                 TEXT NOT NULL,
    alert_id                TEXT NOT NULL,
    base_severity           TEXT NOT NULL,
    severity                TEXT NOT NULL,
    status                  TEXT NOT NULL,
    first_seen              TEXT NOT NULL,
    last_seen               TEXT NOT NULL,
    window_expires_at       TEXT NOT NULL,
    suppression_expires_at  TEXT NOT NULL,
    occurrence_count        INTEGER NOT NULL,
    suppressed_count        INTEGER NOT NULL,
    escalation_level        INTEGER NOT NULL,
    distinct_sources        INTEGER NOT NULL,
    sample_events_json      TEXT NOT NULL,
    closed_at               TEXT
);

CREATE INDEX IF NOT EXISTS idx_alert_buckets_status ON alert_buckets(status);
CREATE INDEX IF NOT EXISTS idx_alert_buckets_rule   ON alert_buckets(rule_id);
