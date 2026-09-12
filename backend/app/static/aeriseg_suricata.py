#!/usr/bin/env python3
import time
import json
import urllib.request
import urllib.error
import argparse
import sys

def follow(thefile):
    """Generator function that yields new lines in a file."""
    thefile.seek(0, 2) # Go to the end of the file
    while True:
        line = thefile.readline()
        if not line:
            time.sleep(0.1)
            continue
        yield line

def post_event(url, raw_log_dict):
    """Sends the Suricata event to the AeriSeg backend."""
    req = urllib.request.Request(url)
    req.add_header('Content-Type', 'application/json')
    jsondata = json.dumps(raw_log_dict).encode('utf-8')
    try:
        response = urllib.request.urlopen(req, jsondata, timeout=3)
        return response.status
    except Exception as e:
        print(f"[!] Failed to send event: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description='AeriSeg Suricata Agent (WSL)')
    parser.add_argument('--url', required=True, help='AeriSeg Suricata Ingest URL (e.g. http://172.24.16.1:8000/api/v1/ingest/suricata)')
    parser.add_argument('--file', default='/var/log/suricata/eve.json', help='Suricata eve.json to monitor')
    args = parser.parse_args()

    print(f"[*] Starting AeriSeg Suricata Agent")
    print(f"[*] Monitoring: {args.file}")
    print(f"[*] Target URL: {args.url}")

    try:
        logfile = open(args.file, "r")
    except Exception as e:
        print(f"[!] Could not open {args.file}: {e}")
        print("    Try running with sudo!")
        sys.exit(1)

    loglines = follow(logfile)
    
    for line in loglines:
        try:
            parsed = json.loads(line)
        except json.JSONDecodeError:
            continue
            
        # Only send certain events to avoid flooding if desired, but for now send all or at least alerts
        # event_type = parsed.get("event_type")
        
        print(f"[->] Sending suricata event: {parsed.get('event_type')}")
        post_event(args.url, parsed)

if __name__ == '__main__':
    main()
