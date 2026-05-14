import json
# import nats
# from nats.js.api import StreamConfig, RetentionPolicy
import structlog


from app.core.config import settings

log = structlog.get_logger()

nc = None
js = None

async def connect_nats():
    global nc, js
    try:
        nc = await nats.connect(
            settings.NATS_URL, 
            max_reconnect_attempts=-1, 
            reconnect_time_wait=2,
            name="medishield-api"
        )
        js = nc.jetstream()
        
        # Ensure stream
        await js.add_stream(name="alerts", subjects=["alerts.*"], retention=RetentionPolicy.LIMITS)
        log.info("nats_connected", url=settings.NATS_URL)
    except Exception as e:
        log.error("nats_connection_failed", error=str(e))

async def close_nats():
    global nc
    if nc:
        await nc.close()

async def subscribe_alerts(callback):
    """
    Subscribes to alerts with pending_msgs_limit fix.
    """
    global js
    if not js:
        log.error("nats_jetstream_not_initialized")
        return None
    try:
        sub = await js.subscribe(
            "alerts.generated", 
            durable="soc_api",
            cb=callback,
            pending_msgs_limit=50  # Fix NATS pending_msgs_limit as requested
        )
        return sub
    except Exception as e:
        log.error("nats_subscribe_failed", error=str(e))
        return None
