REATE DATABASE IF NOT EXISTS medishield;

CREATE TABLE IF NOT EXISTS medishield.raw_logs (
    timestamp    DateTime64(3) NOT NULL,
    log_id       String        DEFAULT '',
    source       LowCardinality(String) DEFAULT '',
    source_ip    String        DEFAULT '',
    dest_ip      String        DEFAULT '',
    protocol     LowCardinality(String) DEFAULT '',
    port         UInt16        DEFAULT 0,
    severity     LowCardinality(String) DEFAULT 'INFO',
    message      String        DEFAULT '',
    event_type   LowCardinality(String) DEFAULT '',
    rule_name    String        DEFAULT '',
    tactic       LowCardinality(String) DEFAULT '',
    mitre_id     LowCardinality(String) DEFAULT '',
    raw_json     String        DEFAULT '{}',
    _date        Date          DEFAULT toDate(timestamp)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(_date)
ORDER BY (timestamp, source_ip, severity)
TTL toDateTime(_date) + INTERVAL 90 DAY;

CREATE TABLE IF NOT EXISTS medishield.alert_events (
    timestamp    DateTime64(3) NOT NULL,
    alert_id     String        DEFAULT '',
    severity     LowCardinality(String) DEFAULT '',
    source       LowCardinality(String) DEFAULT '',
    source_ip    String        DEFAULT '',
    tactic       LowCardinality(String) DEFAULT '',
    mitre_id     LowCardinality(String) DEFAULT '',
    rule_name    String        DEFAULT '',
    _date        Date          DEFAULT toDate(timestamp)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(_date)
ORDER BY (timestamp, severity, source_ip)
TTL toDateTime(_date) + INTERVAL 365 DAY;

CREATE TABLE IF NOT EXISTS medishield.top_source_ips (
    date         Date,
    source_ip    String,
    event_count  UInt64
) ENGINE = SummingMergeTree()
ORDER BY (date, source_ip);

CREATE MATERIALIZED VIEW IF NOT EXISTS medishield.top_source_ips_mv
TO medishield.top_source_ips AS
SELECT toDate(timestamp) AS date, source_ip, count() AS event_count
FROM medishield.raw_logs WHERE source_ip != ''
GROUP BY date, source_ip;
SQLEOF
