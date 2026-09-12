import asyncio
import sqlite3
import os
from sqlalchemy import select
from app.database.session import AsyncSessionLocal
from app.identity.models import User, UserRole
from app.tenants.models import Tenant, Organization
from app.core.security import get_password_hash
import app.models.models  # Ensure all models are registered for relationships

async def migrate_sqlite_auth_to_pg():
    sqlite_path = os.path.join(os.path.dirname(__file__), "..", "..", "aeriseg.db")
    if not os.path.exists(sqlite_path):
        print("SQLite DB not found, skipping migration.")
        return

    conn = sqlite3.connect(sqlite_path)
    conn.row_factory = sqlite3.Row
    try:
        users = conn.execute("SELECT * FROM users").fetchall()
    except Exception as e:
        print(f"Error reading SQLite users: {e}")
        return
    finally:
        conn.close()

    if not users:
        print("No users to migrate.")
        return

    async with AsyncSessionLocal() as session:
        # 1. Ensure default Organization and Tenant exist
        org_result = await session.execute(select(Organization).limit(1))
        org = org_result.scalar_one_or_none()
        if not org:
            org = Organization(name="AeriSeg Default Org")
            session.add(org)
            await session.flush()
        
        tenant_result = await session.execute(select(Tenant).limit(1))
        tenant = tenant_result.scalar_one_or_none()
        if not tenant:
            tenant = Tenant(name="AeriSeg Default Tenant", organization_id=org.id)
            session.add(tenant)
            await session.flush()

        # 2. Migrate users
        for u in users:
            email = u["username"]
            pg_user_res = await session.execute(select(User).where(User.email == email))
            pg_user = pg_user_res.scalar_one_or_none()
            if not pg_user:
                print(f"Migrating user {email}...")
                role_str = u["role"].lower() if u["role"] else "viewer"
                # Map role if needed
                role_enum = UserRole.VIEWER
                if hasattr(UserRole, role_str.upper()):
                    role_enum = UserRole(role_str)
                
                new_user = User(
                    name=u["full_name"] or email,
                    email=email,
                    hashed_password=u["password_hash"], # Copy existing hash to not break login
                    role=role_enum,
                    tenant_id=tenant.id
                )
                session.add(new_user)
        
        await session.commit()
        print("SQLite auth migration complete.")

if __name__ == "__main__":
    asyncio.run(migrate_sqlite_auth_to_pg())
