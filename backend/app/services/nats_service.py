# NATS JetStream Consumer and Publisher Implementation

import asyncio
import nats
from nats.errors import ErrTimeout

class NATSService:
    def __init__(self, servers, subject):
        self.servers = servers
        self.subject = subject
        self.nc = None
        self.js = None

    async def connect(self):
        self.nc = await nats.connect(self.servers)
        self.js = self.nc.jetstream()

    async def publish(self, message):
        await self.js.publish(self.subject, message.encode())
        print(f"Published message to {self.subject}")

    async def subscribe(self, callback):
        await self.js.subscribe(self.subject, cb=callback)
        print(f"Subscribed to {self.subject}")

    async def close(self):
        if self.nc:
            await self.nc.close()

# Example usage
async def main():
    nats_service = NATSService(servers=["nats://localhost:4222"], subject="alerts")
    await nats_service.connect()

    # Publish message
    await nats_service.publish('Real-time alert data')

    # Subscribe for messages
    await nats_service.subscribe(lambda msg: print(f'Alert received: {msg.data.decode()}'))

if __name__ == '__main__':
    asyncio.run(main())
