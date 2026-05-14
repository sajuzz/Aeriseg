import structlog

log = structlog.get_logger()

async def insert_batch(batch):
    log.info("mock_insert_batch", count=len(batch))
