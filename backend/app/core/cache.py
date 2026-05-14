"""
MediShield — In-process async TTL cache.
 
Zero external dependencies. Works with asyncio.
Handles stampede: if 100 requests arrive for the same uncached key,
only ONE calls the backend — the rest wait and share the result.
 
TTL values used:
  report endpoint          → 60s
  analytics summary        → 30s
  compliance summary       → 60s
  users list               → 300s
  alert dedup window       → 120s (mirrors detection engine cooldown)
"""
import asyncio
import time
from typing import Any, Callable, Optional
 
import structlog
 
log = structlog.get_logger()
 
 
class _Entry:
    __slots__ = ("value", "expires_at")
 
    def __init__(self, value: Any, ttl: float):
        self.value = value
        self.expires_at = time.monotonic() + ttl
 
 
class TTLCache:
    def __init__(self):
        self._store: dict[str, _Entry] = {}
        self._locks: dict[str, asyncio.Lock] = {}
 
    # ── private ───────────────────────────────────────────────
 
    def _lock(self, key: str) -> asyncio.Lock:
        if key not in self._locks:
            self._locks[key] = asyncio.Lock()
        return self._locks[key]
 
    def _alive(self, key: str) -> Optional[Any]:
        e = self._store.get(key)
        if e and time.monotonic() < e.expires_at:
            return e.value
        return None
 
    # ── public ────────────────────────────────────────────────
 
    async def get(self, key: str) -> Optional[Any]:
        return self._alive(key)
 
    async def set(self, key: str, value: Any, ttl: int) -> None:
        self._store[key] = _Entry(value, float(ttl))
 
    async def delete(self, key: str) -> None:
        self._store.pop(key, None)
        self._locks.pop(key, None)
 
    async def clear_prefix(self, prefix: str) -> int:
        """Invalidate all keys that start with prefix. Returns count deleted."""
        keys = [k for k in self._store if k.startswith(prefix)]
        for k in keys:
            self._store.pop(k, None)
            self._locks.pop(k, None)
        if keys:
            log.debug("cache_invalidated", prefix=prefix, count=len(keys))
        return len(keys)
 
    async def get_or_set(self, key: str, ttl: int, fn: Callable) -> Any:
        """
        Cache-aside with stampede protection via per-key lock.
        fn must be an async callable (coroutine or lambda returning one).
        """
        # Fast path — no lock needed if already cached
        v = self._alive(key)
        if v is not None:
            log.debug("cache_hit", key=key)
            return v
 
        # Slow path — acquire lock so only one caller runs fn
        async with self._lock(key):
            # Re-check inside lock (another coroutine may have populated it)
            v = self._alive(key)
            if v is not None:
                log.debug("cache_hit_after_lock", key=key)
                return v
            log.debug("cache_miss", key=key)
            value = await fn()
            await self.set(key, value, ttl)
            return value
 
    def stats(self) -> dict:
        now = time.monotonic()
        alive = sum(1 for e in self._store.values() if now < e.expires_at)
        return {"total_keys": len(self._store), "alive_keys": alive}
 
 
# Singleton — import this everywhere
cache = TTLCache()
