import asyncio
from app.database.session import engine
from app.database.base import Base

# Import all models to ensure they are registered with Base.metadata
from app.identity.models import User
from app.tenants.models import Tenant, Organization
import app.models.models

async def create_tables():
    print("Creating tables in PostgreSQL...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully.")

if __name__ == "__main__":
    asyncio.run(create_tables())
