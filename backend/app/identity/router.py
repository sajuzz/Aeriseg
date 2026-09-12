from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import create_access_token, verify_password, get_password_hash
from app.core.dependencies import get_current_user
from app.database.session import get_db
from app.identity.models import User, UserRole
from app.tenants.models import Tenant

router = APIRouter()

@router.post("/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "user": {
            "username": user.email,
            "role": user.role.value if user.role else "VIEWER",
            "full_name": user.name
        }
    }

@router.get("/auth/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user

@router.get("/users")
async def get_users(current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden")
    
    result = await db.execute(select(User))
    users = result.scalars().all()
    
    return {
        "status": "success", 
        "data": [
            {
                "id": u.id, 
                "username": u.email, 
                "full_name": u.name, 
                "role": u.role.value if u.role else "VIEWER", 
                "created_at": u.created_at
            } for u in users
        ]
    }

@router.post("/users")
async def create_user(
    username: str = Body(..., embed=True),
    password: str = Body(..., embed=True),
    full_name: str = Body(..., embed=True),
    role: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden")
    
    try:
        # Fallback logic for tenant (assign to the creator's tenant)
        tenant_id = current_user.get("tenant_id", 1)
        
        # Ensure tenant exists or this will fail FK constraint
        result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = result.scalar_one_or_none()
        
        if not tenant:
            # Fallback to create a dummy tenant
            from app.tenants.models import Organization
            org_result = await db.execute(select(Organization).limit(1))
            org = org_result.scalar_one_or_none()
            if not org:
                org = Organization(name="Default Org")
                db.add(org)
                await db.flush()
            
            tenant = Tenant(name="Default Tenant", organization_id=org.id)
            db.add(tenant)
            await db.flush()
            tenant_id = tenant.id

        password_hash = get_password_hash(password)
        new_user = User(
            name=full_name,
            email=username,
            hashed_password=password_hash,
            role=UserRole(role.lower()) if hasattr(UserRole, role.upper()) else UserRole.VIEWER,
            tenant_id=tenant_id
        )
        db.add(new_user)
        await db.commit()
        return {"status": "success", "message": "User created"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail="User already exists or invalid data")

@router.delete("/users/{user_id}")
async def delete_user(user_id: int, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    try:
        await db.delete(user)
        await db.commit()
        return {"status": "success", "message": "User deleted"}
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Cannot delete user")
