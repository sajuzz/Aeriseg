import sqlite3
import json

conn = sqlite3.connect(r'c:\Users\SJ\Desktop\projects\siem\backend\data\medishield.db')
cursor = conn.cursor()
cursor.execute("SELECT event_id, source, event_type, source_ip FROM telemetry WHERE source='linux_agent' ORDER BY timestamp DESC LIMIT 5;")
rows = cursor.fetchall()
for r in rows:
    print(r)
