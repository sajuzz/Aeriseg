import os
import time
import json
import socket
import requests
import subprocess
from datetime import datetime

MANAGER_URL = os.environ.get("AERISEG_URL", "http://localhost:8000")
EVE_JSON_PATH = os.environ.get("SURICATA_EVE", "/var/log/suricata/eve.json")

def get_hostname():
    return socket.gethostname()

def parse_suricata_event(eve_data):
    # Map eve.json alert into unified telemetry schema
    # Suricata event format:
    # {"timestamp": "2023...", "event_type": "alert", "src_ip": "...", "dest_ip": "...", "alert": {"signature": "...", "severity": 1}}
    
    event_type = eve_data.get("event_type", "unknown")
    if event_type != "alert":
        return None # We are only interested in alerts for this collector, or maybe all events? The requirement says "Reads eve.json continuously, Parses alert events, Normalizes them"
    
    alert_data = eve_data.get("alert", {})
    severity_mapping = {
        1: "CRITICAL",
        2: "HIGH",
        3: "MEDIUM",
        4: "LOW"
    }
    severity_num = alert_data.get("severity", 4)
    severity = severity_mapping.get(severity_num, "INFO")
    
    return {
        "timestamp": eve_data.get("timestamp", datetime.utcnow().isoformat() + "Z"),
        "source": "suricata",
        "hostname": get_hostname(),
        "username": "",
        "source_ip": eve_data.get("src_ip", ""),
        "destination_ip": eve_data.get("dest_ip", ""),
        "event_type": "suricata_alert",
        "severity": severity,
        "raw_log": eve_data,
        "metadata": {
            "signature": alert_data.get("signature", ""),
            "category": alert_data.get("category", "")
        }
    }

def send_event(event):
    payload = {
        "source": "suricata",
        "event_type": event["event_type"],
        "raw_log": event
    }
    try:
        resp = requests.post(f"{MANAGER_URL}/api/v1/ingest/events", json=payload)
        resp.raise_for_status()
    except Exception as e:
        print(f"Failed to send suricata event: {e}")

def tail_eve_json(filepath):
    if not os.path.exists(filepath):
        print(f"Suricata log file {filepath} not found. Ensure Suricata is running and outputting to this path.")
        # We can simulate for MVP if the file doesn't exist by just waiting or creating it.
        # Let's just wait and retry.
        while not os.path.exists(filepath):
            time.sleep(5)
            
    print(f"Tailing Suricata logs from {filepath}...")
    f = subprocess.Popen(['tail', '-F', filepath], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    while True:
        line = f.stdout.readline()
        if line:
            decoded = line.decode('utf-8', errors='ignore')
            try:
                eve_data = json.loads(decoded)
                event = parse_suricata_event(eve_data)
                if event:
                    send_event(event)
            except json.JSONDecodeError:
                pass

if __name__ == "__main__":
    print("Starting AeriSeg Suricata Collector...")
    tail_eve_json(EVE_JSON_PATH)
