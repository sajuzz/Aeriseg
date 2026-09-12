"""
AeriSeg — Global Alert Rate Limiter (Token Bucket)

Last line of defense against alert storms. Even if many DIFFERENT
correlation keys fire NEW alerts simultaneously (e.g. a network-wide
scan touching hundreds of hosts, each a distinct source_ip), the SOC
must not be flooded.

This caps total NEW/ESCALATED alerts surfaced per refill period,
globally — across all rules and all correlation keys.

This does NOT replace per-key suppression in correlation_engine.py.
That handles "same threat repeating." This handles "many different
threats firing at once."
"""
from __future__ import annotations

import asyncio
import time


class TokenBucketLimiter:
    def __init__(self, max_tokens: int = 100, refill_period_secs: float = 60.0):
        self.max_tokens = max_tokens
        self.tokens = float(max_tokens)
        self.refill_period = refill_period_secs
        self.refill_rate = max_tokens / refill_period_secs  # tokens per second
        self.last_refill = time.monotonic()
        self._lock = asyncio.Lock()

    async def allow(self) -> bool:
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self.last_refill
            self.tokens = min(self.max_tokens, self.tokens + elapsed * self.refill_rate)
            self.last_refill = now

            if self.tokens >= 1.0:
                self.tokens -= 1.0
                return True
            return False

    def stats(self) -> dict:
        return {
            "max_tokens":         self.max_tokens,
            "available_tokens":   round(self.tokens, 1),
            "refill_period_secs": self.refill_period,
        }


# Singleton — default: 100 NEW/ESCALATED alerts per minute, globally.
# Tune via global_alert_limiter.max_tokens / refill_period if needed.
global_alert_limiter = TokenBucketLimiter(max_tokens=100, refill_period_secs=60.0)
