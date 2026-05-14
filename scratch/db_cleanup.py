import sqlite3
import os

def cleanup():
    # Path relative to root
    db_path = 'aeriseg.db'
    if not os.path.exists(db_path):
        print(f"DB not found at {db_path}")
        return
        
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    
    try:
        # 1. Fix Alerts Table (Add assigned_to if missing)
        cursor = conn.execute("PRAGMA table_info(alerts)")
        columns = [row['name'] for row in cursor.fetchall()]
        
        if 'assigned_to' not in columns:
            print("Adding assigned_to column to alerts table...")
            conn.execute("ALTER TABLE alerts ADD COLUMN assigned_to INTEGER")
            conn.commit()
        else:
            print("assigned_to already exists in alerts")
            
        # 2. Clear Agents Table
        print("Clearing agents table...")
        conn.execute("DELETE FROM agents")
        conn.commit()
        
        print("Database cleanup successful")
    except Exception as e:
        print(f"Cleanup failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    cleanup()
