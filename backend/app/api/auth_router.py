from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from app.core.auth import create_access_token, get_current_user
from app.db.database import get_db_connection

from app.core.auth import verify_password, get_password_hash
from datetime import timedelta

router = APIRouter()

@router.post("/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = get_db_connection()
    try:
        user = conn.execute("SELECT * FROM users WHERE username = ?", (form_data.username,)).fetchone()
        if not user or not verify_password(form_data.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token = create_access_token(data={"sub": user["username"]})
        return {
            "access_token": access_token, 
            "token_type": "bearer", 
            "user": {
                "username": user["username"],
                "role": user["role"],
                "full_name": user["full_name"]
            }
        }
    finally:
        conn.close()

@router.get("/auth/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user

@router.get("/users")
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden")
    
    conn = get_db_connection()
    try:
        users = conn.execute("SELECT id, username, full_name, role, created_at FROM users").fetchall()
        return {"status": "success", "data": [dict(u) for u in users]}
    finally:
        conn.close()

@router.post("/users")
async def create_user(
    username: str = Body(..., embed=True),
    password: str = Body(..., embed=True),
    full_name: str = Body(..., embed=True),
    role: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden")
    
    conn = get_db_connection()
    try:
        password_hash = get_password_hash(password)
        conn.execute(
            "INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)",
            (username, password_hash, full_name, role)
        )
        conn.commit()
        return {"status": "success", "message": "User created"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="User already exists or invalid data")
    finally:
        conn.close()

@router.delete("/users/{user_id}")
async def delete_user(user_id: int, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "ADMIN":
        raise HTTPException(status_code=403, detail="Forbidden")
    
    conn = get_db_connection()
    try:
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        return {"status": "success", "message": "User deleted"}
    finally:
        conn.close()

