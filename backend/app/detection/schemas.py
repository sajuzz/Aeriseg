"""
AeriSeg Detection Engine — Correlation & Throttle Data Models
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional


class BucketStatus(str, Enum):
    OPEN      = "OPEN"        # actively receiving correlated events
    ESCALATED = "ESCALATED"   # suppressed count crossed threshold, severity bumped
    EXPIRED   = "EXPIRED"     # correlation window closed, no new events
    CLOSED    = "CLOSED"      # manually closed by analyst / SOC workflow


class EngineAction(str, Enum):
    NEW_ALERT               = "NEW_ALERT"
    SUPPRESSED              = "SUPPRESSED"
    ESCALATED               = "ESCALATED"
    DROPPED_DUPLICATE       = "DROPPED_DUPLICATE"
    DROPPED_GLOBAL_THROTTLE = "DROPPED_GLOBAL_THROTTLE"


@dataclass
class RuleCorrelationConfig:
    """
    Per-rule correlation settings, read from each detection rule's YAML
    `correlation:` block. Defaults are conservative — safe even if a
    rule author omits the block entirely.
    """
    rule_id: str
    correlate_by: tuple = ("source_ip",)        # event fields used to group matches
    correlation_window_secs: int = 300          # events within this window merge into one bucket
    suppression_secs: int = 900                 # don't re-surface the same key sooner than this
    escalate_after: int = 50                    # suppressed-match threshold that bumps severity once
    max_samples: int = 25                       # cap stored evidence samples per bucket
    exact_dedup_window_secs: float = 2.0        # layer-1 fast-path: drop byte-identical repeats
    threshold: int = 1                          # minimum occurrences before firing NEW_ALERT


@dataclass
class SampleEvent:
    ts: datetime
    summary: str
    raw_ref: Optional[str] = None   # pointer into telemetry store, not the full payload


@dataclass
class AlertBucket:
    key: str                        # correlation key string (stable hash)
    rule_id: str
    alert_id: str                   # the single alert ID surfaced to the SOC for this bucket
    base_severity: str
    severity: str
    status: BucketStatus = BucketStatus.OPEN

    first_seen: datetime = field(default_factory=datetime.utcnow)
    last_seen: datetime = field(default_factory=datetime.utcnow)
    window_expires_at: datetime = field(default_factory=datetime.utcnow)
    suppression_expires_at: datetime = field(default_factory=datetime.utcnow)

    occurrence_count: int = 1       # total matching events seen (incl. the first)
    suppressed_count: int = 0       # events merged silently — no new alert fired for these
    escalation_level: int = 0       # 0 = base, 1 = escalated once

    distinct_sources: set = field(default_factory=set)
    sample_events: list = field(default_factory=list)

    def add_sample(self, summary: str, raw_ref: Optional[str], cap: int) -> None:
        self.sample_events.append(SampleEvent(ts=datetime.utcnow(), summary=summary, raw_ref=raw_ref))
        if len(self.sample_events) > cap:
            self.sample_events.pop(0)

    def to_dict(self) -> dict:
        return {
            "key":               self.key,
            "rule_id":           self.rule_id,
            "alert_id":          self.alert_id,
            "severity":          self.severity,
            "base_severity":     self.base_severity,
            "status":            self.status.value,
            "first_seen":        self.first_seen.isoformat(),
            "last_seen":         self.last_seen.isoformat(),
            "occurrence_count":  self.occurrence_count,
            "suppressed_count":  self.suppressed_count,
            "escalation_level":  self.escalation_level,
            "distinct_sources":  len(self.distinct_sources),
            "sample_events": [
                {"ts": s.ts.isoformat(), "summary": s.summary, "raw_ref": s.raw_ref}
                for s in self.sample_events
            ],
        }


@dataclass
class EngineResult:
    action: EngineAction
    bucket: Optional[AlertBucket] = None
    reason: str = ""


def fingerprint(*parts: Any) -> str:
    """Stable short hash used for exact-duplicate detection and correlation keys."""
    raw = "|".join(str(p) for p in parts)
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]
