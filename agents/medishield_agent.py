import os
import sys
import time
import requests
import argparse
from collectors.nginx import NginxCollector

# SIEM server URL
SIEM_URL = os.environ.get("SIEM_URL", "http://127.0.0.1:8000/api/v1/ingest/events")

def send_to_siem(event: dict):
    try:
        res = requests.post(SIEM_URL, json=event, timeout=3)
        if res.status_code == 200:
            print(f"[+] Sent event from {event['source']}")
        else:
            print(f"[-] Failed to send event: HTTP {res.status_code}")
    except Exception as e:
        print(f"[!] Error connecting to SIEM: {e}")

def main():
    parser = argparse.ArgumentParser(description="MediShield SIEM Agent")
    parser.add_argument("--nginx-log", help="Path to Nginx access log", default="nginx_access.log")
    args = parser.parse_args()
    
    collectors = []
    
    print(f"[*] Starting Nginx Collector on {args.nginx_log}")
    collectors.append(NginxCollector(args.nginx_log, send_to_siem))
        
    for c in collectors:
        c.start()
        
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[*] Stopping agent...")
        for c in collectors:
            c.stop()

if __name__ == "__main__":
    main()
