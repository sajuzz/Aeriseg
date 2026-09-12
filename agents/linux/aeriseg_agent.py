import os
import time
import socket
import json
import threading
import requests
import subprocess
from datetime import datetime

MANAGER_URL = os.environ.get("AERISEG_URL", "http://localhost:8000")
AGENT_ID_FILE = "/etc/aeriseg/agent_id"

def get_hostname():
    return socket.gethostname()

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip

def register():
    if os.path.exists(AGENT_ID_FILE):
        with open(AGENT_ID_FILE, "r") as f:
            return f.read().strip()
    
    # Register with backend
    payload = {
        "hostname": get_hostname(),
        "ip_address": get_ip(),
        "os_type": "linux",
        "enrollment_key": "7f3a8c9d4e"
    }
    
    try:
        resp = requests.post(f"{MANAGER_URL}/api/v1/agents/enroll", json=payload)
        resp.raise_for_status()
        agent_data = resp.json().get("data", {})
        agent_id = agent_data.get("agent_id")
        
        if agent_id:
            os.makedirs(os.path.dirname(AGENT_ID_FILE), exist_ok=True)
            with open(AGENT_ID_FILE, "w") as f:
                f.write(agent_id)
            return agent_id
    except Exception as e:
        print(f"Failed to register agent: {e}")
    
    return None

def heartbeat(agent_id):
    while True:
        try:
            requests.post(f"{MANAGER_URL}/api/v1/agents/{agent_id}/heartbeat", json={"status": "ONLINE"})
        except Exception as e:
            print(f"Heartbeat failed: {e}")
        time.sleep(30)

def parse_log_line(line, log_source):
    # Basic parsing logic for auth.log / syslog
    # For MVP, we extract simple keywords and map to unified schema
    hostname = get_hostname()
    event_type = "system_log"
    severity = "INFO"
    username = ""
    source_ip = ""
    
    line_lower = line.lower()
    if "sshd" in line_lower:
        if "failed password" in line_lower:
            event_type = "ssh_failed_login"
            severity = "HIGH"
            parts = line.split()
            try:
                if "invalid user" in line_lower:
                    username = parts[parts.index("user")+1]
                else:
                    username = parts[parts.index("for")+1]
                source_ip = parts[parts.index("from")+1]
            except ValueError:
                pass
        elif "accepted publickey" in line_lower or "accepted password" in line_lower:
            event_type = "ssh_successful_login"
            try:
                parts = line.split()
                username = parts[parts.index("for")+1]
                source_ip = parts[parts.index("from")+1]
            except ValueError:
                pass
    elif "sudo" in line_lower and "command=" in line_lower:
        event_type = "sudo_execution"
        try:
            parts = line.split()
            username = parts[parts.index("sudo:") - 1]
        except ValueError:
            pass

    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "source": "linux_agent",
        "hostname": hostname,
        "username": username,
        "source_ip": source_ip,
        "destination_ip": get_ip(),
        "event_type": event_type,
        "severity": severity,
        "raw_log": {"message": line.strip(), "file": log_source},
        "metadata": {"agent_version": "1.0.0"}
    }

def send_event(event):
    # The /v1/ingest/events expects: {"source": "linux_agent", "event_type": "...", "raw_log": {...}}
    # But we mapped it fully so we might need a specific parser or just bypass parser if we use a different endpoint
    # Let's use the standard ingest endpoint and assume the backend accepts it or we use batch endpoint.
    payload = {
        "source": "linux_agent",
        "event_type": event["event_type"],
        "raw_log": event
    }
    try:
        requests.post(f"{MANAGER_URL}/api/v1/ingest/events", json=payload)
    except Exception as e:
        print(f"Failed to send event: {e}")

def tail_file(filepath):
    if not os.path.exists(filepath):
        print(f"File {filepath} not found, skipping.")
        return
    
    print(f"Tailing {filepath}...")
    f = subprocess.Popen(['tail', '-F', filepath], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    while True:
        line = f.stdout.readline()
        if line:
            decoded = line.decode('utf-8', errors='ignore')
            event = parse_log_line(decoded, filepath)
            send_event(event)

if __name__ == "__main__":
    print("Starting AeriSeg Linux Agent...")
    agent_id = None
    while not agent_id:
        agent_id = register()
        if not agent_id:
            time.sleep(5)
    
    print(f"Agent registered with ID: {agent_id}")
    
    threading.Thread(target=heartbeat, args=(agent_id,), daemon=True).start()
    
    log_files = ["/var/log/auth.log", "/var/log/syslog"]
    threads = []
    for log_file in log_files:
        t = threading.Thread(target=tail_file, args=(log_file,), daemon=True)
        t.start()
        threads.append(t)
        
    for t in threads:
        t.join()
