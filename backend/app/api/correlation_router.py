"""
backend/app/api/correlation_router.py

Exposes the correlation engine's internal state so analysts can see
how much noise is being suppressed — critical for trusting that
"fewer alerts" doesn't mean "missing alerts."
"""
from fastapi import APIRouter, HTTPException

from app.detection.bucket_store import bucket_store
from app.detection.dedup_filter import exact_dedup
from app.detection.rate_limiter import global_alert_limiter

router = APIRouter(prefix="/api/detection/correlation", tags=["correlation"])


@router.get("/buckets")
async def list_active_buckets():
    """All currently open or escalated correlation buckets."""
    buckets = await bucket_store.all_open()
    return [b.to_dict() for b in buckets]


@router.get("/buckets/{key}")
async def get_bucket(key: str):
    bucket = await bucket_store.get(key)
    if not bucket:
        raise HTTPException(404, "Bucket not found or already expired")
    return bucket.to_dict()


@router.get("/stats")
async def suppression_stats():
    """
    Noise-reduction summary: how many raw matching events were
    collapsed into how many actually-surfaced alerts.
    """
    buckets = await bucket_store.all_open()
    total_occurrences = sum(b.occurrence_count for b in buckets)
    total_suppressed  = sum(b.suppressed_count for b in buckets)
    alerts_surfaced    = len(buckets)  # one alert per open bucket, by design

    efficiency = (
        round(100 * total_suppressed / total_occurrences, 1)
        if total_occurrences else 0.0
    )

    return {
        "alerts_surfaced_to_soc":   alerts_surfaced,
        "total_matching_events":   total_occurrences,
        "total_suppressed_events": total_suppressed,
        "noise_reduction_pct":     efficiency,
        "exact_dedup_filter":      exact_dedup.stats(),
        "global_rate_limiter":     global_alert_limiter.stats(),
    }
