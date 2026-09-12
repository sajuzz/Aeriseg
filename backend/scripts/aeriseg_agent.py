#!/usr/bin/env python3
import time
import json
import urllib.request
import urllib.error
import argparse
import sys
import re
from datetime import datetime

# Regex for standard syslog/auth.log lines:
# "Jun 24 10:22:33 hostname sshd[123]: Accepted password for root from 192.168.1.100 port 50400"
SYSLOG_REGEX = re.compile(r'^(?P<month>[A-Z][a-z]{2})\s+(?P<day>\d+)\s+(?P<time>\d{2}:\d{2}:\d{2})\s+(?P<host>\S+)\s+(?P<process>\S+?)(?:\[(?P<pid>\d+)\])?:\s+(?P<message>.*)$')

# Regex to extract IPs
IP_REGEX = re.compile(r'(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})')

def follow(thefile):
    """Generator function that yields new lines in a file."""
    thefile.seek(0, 2) # Go to the end of the file
    while True:
        line = thefile.readline()
        if not line:
            time.sleep(0.1)
            continue
        yield line

def parse_syslog_line(line):
    """Parses a standard syslog line and extracts common fields."""
    match = SYSLOG_REGEX.match(line)
    if not match:
        return {"raw_message": line.strip()}
    
    data = match.groupdict()
    
    # Extract IPs
    ips = IP_REGEX.findall(data['message'])
    if ips:
        data['extracted_ip'] = ips[0]
        
    return data

def post_event(url, event_data):
    """Sends the event to the AeriSeg backend."""
    req = urllib.request.Request(url)
    req.add_header('Content-Type', 'application/json')
    jsondata = json.dumps(event_data).encode('utf-8')
    try:
        response = urllib.request.urlopen(req, jsondata, timeout=3)
        return response.status
    except Exception as e:
        print(f"[!] Failed to send event: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description='AeriSeg Linux Agent (WSL)')
    parser.add_argument('--url', required=True, help='AeriSeg Ingest URL (e.g. http://172.24.16.1:8000/v1/ingest/events)')
    parser.add_argument('--file', default='/var/log/auth.log', help='Log file to monitor')
    args = parser.parse_args()

    print(f"[*] Starting AeriSeg Linux Agent")
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
        parsed = parse_syslog_line(line)
        
        # Determine basic fields
        src_ip = parsed.get("extracted_ip", "127.0.0.1")
        timestamp = datetime.utcnow().isoformat() + "Z"
        
        # Map to AeriSeg IngestEvent Schema
        event = {
            "source": "linux_agent",
            "event_type": "auth" if "sshd" in parsed.get("process", "") or "sudo" in parsed.get("process", "") else "syslog",
            "timestamp": timestamp,
            "source_ip": src_ip,
            "severity": "INFO",
            "raw_log": parsed
        }
        
        # Simple heuristic for severity/event_type based on common auth.log patterns
        msg = parsed.get("message", "").lower()
        if "failed password" in msg:
            event["severity"] = "HIGH"
            event["event_type"] = "auth_failure"
        elif "accepted password" in msg or "session opened" in msg:
            event["severity"] = "INFO"
            event["event_type"] = "auth_success"
        elif "authentication failure" in msg:
            event["severity"] = "HIGH"
            event["event_type"] = "auth_failure"
            
        # Send
        print(f"[->] Sending event: {event['event_type']} from {src_ip}")
        post_event(args.url, event)

if __name__ == '__main__':
    main()
