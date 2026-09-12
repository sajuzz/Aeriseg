#!/bin/bash
set -e

# AeriSeg Agent Installer
# Usage: curl -sSL http://manager/install.sh | sudo bash -s -- --manager <ip> --key <key>

MANAGER_IP=""
ENROLLMENT_KEY=""

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --manager) MANAGER_IP="$2"; shift ;;
        --key) ENROLLMENT_KEY="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

if [ -z "$MANAGER_IP" ] || [ -z "$ENROLLMENT_KEY" ]; then
    echo "Usage: $0 --manager <ip> --key <key>"
    exit 1
fi

echo "[*] Starting AeriSeg Agent Installation"

# 1. Create directories
mkdir -p /opt/aeriseg
mkdir -p /etc/aeriseg

# 2. Get OS info
OS_TYPE="linux"
HOSTNAME=$(hostname)
IP_ADDR=$(hostname -I | awk '{print $1}')

echo "[*] Registering agent with manager at $MANAGER_IP..."

# 3. Register with API
RESPONSE=$(curl -s -X POST "http://$MANAGER_IP:8000/api/agents/enroll" \
  -H "Content-Type: application/json" \
  -d "{\"hostname\":\"$HOSTNAME\",\"ip_address\":\"$IP_ADDR\",\"os_type\":\"$OS_TYPE\",\"enrollment_key\":\"$ENROLLMENT_KEY\"}")

STATUS=$(python3 -c "import sys, json; print(json.load(sys.stdin).get('status', ''))" <<< "$RESPONSE")
if [ "$STATUS" != "success" ]; then
    echo "[!] Registration failed: $RESPONSE"
    exit 1
fi

AGENT_ID=$(python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('agent_id', ''))" <<< "$RESPONSE")
echo "[+] Registration successful! Agent ID: $AGENT_ID"


# 4. Write config
cat <<EOF > /etc/aeriseg/agent.conf
{
    "agent_id": "$AGENT_ID",
    "manager_url": "http://$MANAGER_IP:8000",
    "log_files": ["/var/log/auth.log", "/var/log/syslog"]
}
EOF

# 5. Download Agent Scripts
# In a real environment, this would download from GitHub or the manager static files.
# Since we are running locally and serving static files from the manager, we'll download it from the manager directly.
curl -s -o /opt/aeriseg/aeriseg_agent.py "http://$MANAGER_IP:8000/aeriseg_agent.py"
curl -s -o /opt/aeriseg/aeriseg_suricata.py "http://$MANAGER_IP:8000/aeriseg_suricata.py"

if [ ! -f /opt/aeriseg/aeriseg_agent.py ]; then
    echo "[!] Failed to download agent script."
    exit 1
fi

chmod +x /opt/aeriseg/aeriseg_agent.py
chmod +x /opt/aeriseg/aeriseg_suricata.py

# 6. Create systemd services
cat <<EOF > /etc/systemd/system/aeriseg-agent.service
[Unit]
Description=AeriSeg Endpoint Security Agent
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/python3 /opt/aeriseg/aeriseg_agent.py --url http://$MANAGER_IP:8000/api/v1/ingest/events --file /var/log/auth.log
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

cat <<EOF > /etc/systemd/system/aeriseg-suricata.service
[Unit]
Description=AeriSeg Suricata Forwarder Agent
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/python3 /opt/aeriseg/aeriseg_suricata.py --url http://$MANAGER_IP:8000/api/v1/ingest/suricata --file /var/log/suricata/eve.json
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 7. Start services
echo "[*] Enabling and starting services..."
systemctl daemon-reload
systemctl enable aeriseg-agent
systemctl start aeriseg-agent
systemctl enable aeriseg-suricata
systemctl start aeriseg-suricata

echo "[+] AeriSeg Agents successfully installed and running!"

