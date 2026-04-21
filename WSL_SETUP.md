# MediShield SOC — WSL Setup Guide

## Prerequisites

- Windows 10 (21H2+) or Windows 11
- WSL2 with Ubuntu 20.04, 22.04, or 24.04
- At least 8GB RAM on your Windows machine (4GB allocated to WSL)

---

## Step 0 — Verify WSL2 (not WSL1)

In PowerShell:
```powershell
wsl --list --verbose
# NAME      STATE    VERSION
# Ubuntu    Running  2        ← must be 2
```

If it shows VERSION 1, upgrade:
```powershell
wsl --set-version Ubuntu 2
```

---

## Step 1 — Tune WSL2 memory (recommended)

Create `C:\Users\<YourName>\.wslconfig` in Notepad with this content:

```ini
[wsl2]
memory=4GB          # How much RAM WSL2 can use (adjust to your machine)
processors=4        # CPU cores for WSL2
swap=2GB
localhostForwarding=true
```

Then restart WSL2 from PowerShell:
```powershell
wsl --shutdown
# Wait 10 seconds, then reopen Ubuntu
```

---

## Step 2 — Copy and install

```bash
# In your WSL Ubuntu terminal:

# 1. Get the project into WSL filesystem (NOT /mnt/c/ — use native WSL path)
mkdir -p ~/projects
cp -r /mnt/c/Users/YourName/Downloads/medishield-soc ~/projects/
sudo cp -r ~/projects/medishield-soc /opt/medishield
cd /opt/medishield

# 2. Install everything
bash scripts/01_install.sh

# 3. Start all services
bash scripts/02_start.sh

# 4. Seed demo data
bash scripts/03_seed.sh

# 5. Verify everything works
bash scripts/04_smoke_test.sh
```

---

## Step 3 — Access from Windows

Once running, open your **Windows** browser (Chrome, Edge, Firefox):

```
http://localhost:8000/api/docs    ← Swagger UI (full API documentation)
http://localhost:8222             ← NATS monitor
```

WSL2 automatically forwards ports — `localhost` in Windows = WSL2.

---

## Step 4 — Start simulator (live demo mode)

```bash
# Generates realistic hospital events every 2 seconds
# NATS → Detection Engine → Auto alerts → Auto cases
bash /opt/medishield/scripts/06_start_simulator.sh

# Watch events flow in real-time:
tail -f /opt/medishield/logs/detection.log   # Detection engine alerts
tail -f /opt/medishield/logs/api.log          # API processing
```

---

## Daily workflow

```bash
# Start everything (run this every time you open WSL)
bash /opt/medishield/scripts/02_start.sh

# Check status
bash /opt/medishield/scripts/status.sh

# Stop everything
bash /opt/medishield/scripts/05_stop.sh
```

---

## Important: WSL filesystem location

**Always work in the WSL native filesystem (`/home/` or `/opt/`), NOT on `/mnt/c/`.**

`/mnt/c/` is the Windows drive mounted in WSL. File I/O there is 5-10x slower and PostgreSQL/ClickHouse data files must be on the WSL native filesystem.

```bash
# CORRECT — fast native filesystem
/opt/medishield/

# AVOID — slow Windows filesystem
/mnt/c/Users/.../medishield/
```

---

## Troubleshooting

### PostgreSQL won't start
```bash
# Check cluster status
pg_lsclusters

# Start manually
pg_ctlcluster 15 main start

# Check logs
cat /var/log/postgresql/postgresql-15-main.log | tail -30
```

### ClickHouse won't start
```bash
# Check error log
cat /var/log/clickhouse-server/clickhouse-server.err.log | tail -30

# Restart manually
sudo pkill -f clickhouse-server
sudo clickhouse-server --daemon --pid-file=/opt/medishield/pids/clickhouse.pid
```

### NATS won't start
```bash
cat /opt/medishield/logs/nats.log | tail -20

# Restart manually
pkill -f nats-server
nats-server -c /opt/medishield/nats-server.conf -P /opt/medishield/pids/nats.pid &
```

### API crashes on startup
```bash
tail -50 /opt/medishield/logs/api.log

# Most common cause: PostgreSQL not ready yet
# Fix: wait 5 seconds and re-run 02_start.sh
```

### Port already in use
```bash
# Find what is using port 8000
sudo lsof -i :8000

# Kill it
kill -9 <PID>
```

### WSL2 loses network after sleep
```bash
# Restart WSL networking
wsl --shutdown   # in PowerShell
# Then reopen Ubuntu and run 02_start.sh
```

---

## Logs location

```
/opt/medishield/logs/
├── install.log       ← install output
├── api.log           ← FastAPI uvicorn
├── detection.log     ← detection engine
├── nats.log          ← NATS server
├── clickhouse.log    ← ClickHouse startup
└── simulator.log     ← log simulator (if running)
```

---

## Default accounts

| Username   | Password      | Role           | Can do                          |
|------------|---------------|----------------|---------------------------------|
| admin      | Admin@1234!   | admin          | Everything                      |
| l1_analyst | L1Demo@1234!  | l1_analyst     | View + triage L1 cases          |
| l2_invest  | L2Demo@1234!  | l2_investigator| Investigate, create incidents   |
| l3_lead    | L3Demo@1234!  | l3_ir_lead     | Close incidents, full response  |
| it_ops     | ItOps@1234!   | it_ops         | Read-only                       |
| mgmt       | Mgmt@1234!    | management     | Reports + analytics             |
