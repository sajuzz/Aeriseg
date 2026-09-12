#!/bin/bash
echo "Installing AeriSeg Linux Agent..."

# Install python3 if not installed
if ! command -v python3 &> /dev/null; then
    echo "Python3 not found. Installing..."
    sudo apt-get update && sudo apt-get install -y python3 python3-pip
fi

pip3 install requests

# Copy agent script
sudo mkdir -p /opt/aeriseg
# Assuming the script is downloaded to the current directory
if [ -f "aeriseg_agent.py" ]; then
    sudo cp aeriseg_agent.py /opt/aeriseg/aeriseg_agent.py
else
    # In a real scenario, this would curl from the manager
    sudo curl -k -o /opt/aeriseg/aeriseg_agent.py http://localhost:8000/static/aeriseg_agent.py
fi

# Create systemd service
cat << EOF | sudo tee /etc/systemd/system/aeriseg-agent.service
[Unit]
Description=AeriSeg Linux Telemetry Agent
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/python3 /opt/aeriseg/aeriseg_agent.py
Restart=always
RestartSec=5
Environment="AERISEG_URL=http://192.168.56.1:8000"

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable aeriseg-agent
sudo systemctl start aeriseg-agent

echo "AeriSeg agent installed and started."
