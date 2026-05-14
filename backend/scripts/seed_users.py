import os
import sys
from passlib.context import CryptContext
import sqlite3

# Path setup
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from backend.app.db.database import DB_PATH

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def seed():

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    username = "admin"
    password = "admin123"
    password_hash = pwd_context.hash(password)
    
    try:
        cursor.execute("DELETE FROM users WHERE username = ?", (username,))
        cursor.execute("""
            INSERT INTO users (username, password_hash, role, full_name) 
            VALUES (?, ?, ?, ?)
        """, (username, password_hash, "ADMIN", "System Administrator"))
        conn.commit()
        print(f"User {username} seeded successfully.")
    except Exception as e:
        print(f"Error seeding user: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    seed()
