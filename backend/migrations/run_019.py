import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "aeriseg.db")
MIGRATION_PATH = os.path.join(os.path.dirname(__file__), "019_unified_telemetry.sql")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

try:
    with open(MIGRATION_PATH, 'r') as f:
        sql = f.read()
    cursor.executescript(sql)
    conn.commit()
    print("Migration 019 applied successfully")
except Exception as e:
    print(f"Migration failed: {e}")
finally:
    conn.close()
