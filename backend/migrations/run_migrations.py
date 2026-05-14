import sqlite3
import os
import structlog

log = structlog.get_logger()
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "aeriseg.db")
MIGRATIONS_DIR = os.path.dirname(__file__)

def run_migrations():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create schema_migrations table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            migration_name TEXT UNIQUE NOT NULL,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    
    # Get applied migrations
    cursor.execute("SELECT migration_name FROM schema_migrations")
    applied = {row[0] for row in cursor.fetchall()}
    
    # Find all .sql files in migrations dir
    files = sorted([f for f in os.listdir(MIGRATIONS_DIR) if f.endswith('.sql')])
    
    for file in files:
        if file not in applied:
            log.info("applying_migration", file=file)
            with open(os.path.join(MIGRATIONS_DIR, file), 'r') as f:
                sql = f.read()
            
            try:
                # We use executescript for multiple statements
                cursor.executescript(sql)
                cursor.execute("INSERT INTO schema_migrations (migration_name) VALUES (?)", (file,))
                conn.commit()
                log.info("migration_success", file=file)
            except Exception as e:
                log.error("migration_failed", file=file, error=str(e))
                conn.rollback()
                break
                
    conn.close()

if __name__ == "__main__":
    run_migrations()
