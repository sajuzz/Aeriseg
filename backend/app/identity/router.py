from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.auth import create_access_token, verify_password, get_password_hash
from app.core.dependencies import get_current_user
from app.database.session import get_db
from app.identity.models import User

router = APIRouter()

@router.post("/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.username})
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "user": {
            "username": user.username,
            "role": user.role or "ANALYST",
            "full_name": user.full_name or user.username
        }
    }

@router.get("/auth/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user

@router.get("/users")
async def get_users(current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden")
    
    result = await db.execute(select(User))
    users = result.scalars().all()
    
    return {
        "status": "success", 
        "data": [
            {
                "id": u.id, 
                "username": u.username, 
                "full_name": u.full_name, 
                "role": u.role or "ANALYST", 
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
    if current_user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden")
    
    try:
        pw_hash = get_password_hash(password)
        new_user = User(
            username=username,
            password_hash=pw_hash,
            full_name=full_name,
            role=role.upper()
        )
        db.add(new_user)
        await db.commit()
        return {"status": "success", "message": "User created"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail="User already exists or invalid data")

@router.delete("/users/{user_id}")
async def delete_user(user_id: int, current_user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.get("role") != "ADMIN":
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
