#!/usr/bin/env bash
# =============================================================
# MediShield SOC — WSL Ubuntu Install Script
# Tested on: WSL2 + Ubuntu 20.04 / 22.04 / 24.04
#
# WSL differences handled:
#   - No systemctl / systemd  → direct process management
#   - No UFW                  → WSL uses Windows networking
#   - PostgreSQL via pg_ctlcluster
#   - ClickHouse runs as daemon process
#   - NATS runs as background process with PID file
#   - All logs go to /opt/medishield/logs/
#
# Run as:  bash scripts/01_install.sh
#          (no sudo needed for most steps; prompted when required)
# =============================================================
set -euo pipefail

INSTALL_DIR="/opt/medishield"
LOG_DIR="${INSTALL_DIR}/logs"
LOG_FILE="${LOG_DIR}/install.log"
POSTGRES_PASSWORD="ms_secure_pass_2024"
CLICKHOUSE_PASSWORD="ch_secure_pass_2024"
NATS_VERSION="2.10.18"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()     { echo -e "${GREEN}[$(date '+%H:%M:%S')] $*${NC}" | tee -a "$LOG_FILE"; }
warn()    { echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARN: $*${NC}" | tee -a "$LOG_FILE"; }
fail()    { echo -e "${RED}[$(date '+%H:%M:%S')] FAIL: $*${NC}" | tee -a "$LOG_FILE"; exit 1; }
section() { echo -e "\n${CYAN}━━━ $* ━━━${NC}" | tee -a "$LOG_FILE"; }

# ── Pre-flight ────────────────────────────────────────────────
sudo mkdir -p "$LOG_DIR" "$INSTALL_DIR"
sudo chown -R "$USER:$USER" "$INSTALL_DIR"
touch "$LOG_FILE"

log "============================================"
log " MediShield SOC — WSL Install"
log " Log: $LOG_FILE"
log "============================================"

# Detect WSL
if grep -qi "microsoft\|wsl" /proc/version 2>/dev/null; then
    WSL_VER=$(uname -r | grep -oP 'WSL\K[0-9]' 2>/dev/null || echo "2")
    log "WSL detected — version: WSL${WSL_VER}"
    if [[ "$WSL_VER" == "1" ]]; then
        warn "WSL1 detected. WSL2 is strongly recommended."
        warn "Upgrade with (in PowerShell): wsl --set-version Ubuntu 2"
        warn "Continuing with WSL1 compatible mode..."
    fi
else
    warn "Not running inside WSL — this script is optimised for WSL."
    warn "For native Ubuntu, use the regular 01_install_ubuntu.sh"
    read -rp "Continue anyway? [y/N] " ans
    [[ "${ans,,}" == "y" ]] || exit 0
fi

# Detect Ubuntu version
source /etc/os-release
UBUNTU_VER="${VERSION_ID:-unknown}"
log "OS: $PRETTY_NAME"

# Check RAM
TOTAL_RAM_GB=$(awk '/MemTotal/{printf "%d", $2/1024/1024}' /proc/meminfo)
log "RAM available to WSL: ${TOTAL_RAM_GB}GB"
[[ $TOTAL_RAM_GB -lt 2 ]] && warn "Less than 2GB RAM — ClickHouse may struggle. Consider increasing WSL memory in .wslconfig"

# ── Step 1: System packages ───────────────────────────────────
section "Step 1/7 — System packages"

sudo apt-get update -qq 2>>"$LOG_FILE"
sudo apt-get install -y -qq \
    curl wget gnupg2 ca-certificates lsb-release \
    apt-transport-https software-properties-common \
    build-essential git jq unzip net-tools \
    python3 python3-pip python3-venv python3-dev \
    libpq-dev \
    postgresql postgresql-client \
    2>>"$LOG_FILE"

# Python version check — 20.04 ships 3.8, need 3.10+
PY_MINOR=$(python3 -c "import sys; print(sys.version_info.minor)")
PY_MAJOR=$(python3 -c "import sys; print(sys.version_info.major)")

if [[ $PY_MAJOR -lt 3 || ($PY_MAJOR -eq 3 && $PY_MINOR -lt 10) ]]; then
    log "Python $(python3 --version) is too old — installing 3.10 from deadsnakes"
    sudo add-apt-repository -y ppa:deadsnakes/ppa >>"$LOG_FILE" 2>&1
    sudo apt-get update -qq 2>>"$LOG_FILE"
    sudo apt-get install -y -qq python3.10 python3.10-venv python3.10-dev 2>>"$LOG_FILE"
    PYTHON_BIN="python3.10"
else
    PYTHON_BIN="python3"
fi
log "Python: $($PYTHON_BIN --version) → $PYTHON_BIN"

# ── Step 2: PostgreSQL ────────────────────────────────────────
section "Step 2/7 — PostgreSQL"

# In WSL, PostgreSQL is managed directly — no systemctl
# Find PostgreSQL version and cluster
PG_VERSION=$(pg_lsclusters -h 2>/dev/null | awk '{print $1}' | head -1 || psql --version | grep -oP '\d+' | head -1)
log "  PostgreSQL version: $PG_VERSION"

# Start PostgreSQL cluster (WSL-safe method)
pg_ctlcluster "$PG_VERSION" main start 2>>"$LOG_FILE" || true
sleep 2

# Wait for PostgreSQL
for i in {1..15}; do
    pg_isready -q 2>/dev/null && break
    sleep 1
    pg_ctlcluster "$PG_VERSION" main start 2>>"$LOG_FILE" || true
done
pg_isready -q 2>/dev/null || fail "PostgreSQL did not start. Check: pg_ctlcluster $PG_VERSION main status"

# Create user and database
sudo -u postgres psql 2>>"$LOG_FILE" << SQLEOF
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'medishield') THEN
        CREATE ROLE medishield WITH LOGIN PASSWORD '${POSTGRES_PASSWORD}';
    ELSE
        ALTER ROLE medishield WITH PASSWORD '${POSTGRES_PASSWORD}';
    END IF;
END
\$\$;
SELECT 'CREATE DATABASE medishield OWNER medishield'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'medishield')
\gexec
GRANT ALL PRIVILEGES ON DATABASE medishield TO medishield;
SQLEOF

# Fix pg_hba.conf for md5 auth (asyncpg needs this)
PG_HBA=$(sudo -u postgres psql -t -c "SHOW hba_file;" 2>/dev/null | xargs)
if [[ -f "$PG_HBA" ]]; then
    if ! sudo grep -q "^host.*medishield.*medishield.*md5" "$PG_HBA" 2>/dev/null; then
        sudo bash -c "echo 'host  medishield  medishield  127.0.0.1/32  md5' >> \"$PG_HBA\""
        sudo bash -c "echo 'host  medishield  medishield  ::1/128       md5' >> \"$PG_HBA\""
        pg_ctlcluster "$PG_VERSION" main reload 2>>"$LOG_FILE" || true
        log "  pg_hba.conf updated for md5 auth"
    fi
fi

log "  PostgreSQL ready — localhost:5432"

# ── Step 3: ClickHouse ────────────────────────────────────────
section "Step 3/7 — ClickHouse"

if ! command -v clickhouse-server &>/dev/null; then
    log "  Installing ClickHouse..."
    sudo apt-get install -y -qq apt-transport-https 2>>"$LOG_FILE"

    curl -fsSL 'https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key' \
        | sudo gpg --dearmor -o /usr/share/keyrings/clickhouse-keyring.gpg 2>>"$LOG_FILE"

    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/clickhouse-keyring.gpg] \
https://packages.clickhouse.com/deb stable main" \
        | sudo tee /etc/apt/sources.list.d/clickhouse.list >>"$LOG_FILE"

    sudo apt-get update -qq 2>>"$LOG_FILE"
    # Set password non-interactively
    echo "clickhouse-server clickhouse-server/default-password password ${CLICKHOUSE_PASSWORD}" \
        | sudo debconf-set-selections
    DEBIAN_FRONTEND=noninteractive sudo apt-get install -y -qq \
        clickhouse-server clickhouse-client 2>>"$LOG_FILE"
    log "  ClickHouse installed"
else
    log "  ClickHouse already installed — skipping"
fi

# Write user config
sudo mkdir -p /etc/clickhouse-server/users.d
sudo tee /etc/clickhouse-server/users.d/medishield.xml >>"$LOG_FILE" << EOF
<clickhouse>
    <users>
        <medishield>
            <password>${CLICKHOUSE_PASSWORD}</password>
            <networks><ip>::/0</ip></networks>
            <profile>default</profile>
            <quota>default</quota>
        </medishield>
    </users>
</clickhouse>
EOF

# Memory limits — safe for WSL
sudo mkdir -p /etc/clickhouse-server/config.d
sudo tee /etc/clickhouse-server/config.d/medishield.xml >>"$LOG_FILE" << 'EOF'
<clickhouse>
    <max_server_memory_usage_to_ram_ratio>0.4</max_server_memory_usage_to_ram_ratio>
    <max_concurrent_queries>10</max_concurrent_queries>
    <max_connections>50</max_connections>
    <logger>
        <level>warning</level>
        <console>0</console>
        <log>/var/log/clickhouse-server/clickhouse-server.log</log>
        <errorlog>/var/log/clickhouse-server/clickhouse-server.err.log</errorlog>
    </logger>
</clickhouse>
EOF

log "  ClickHouse configured"

# ── Step 4: NATS ──────────────────────────────────────────────
section "Step 4/7 — NATS JetStream"

if ! command -v nats-server &>/dev/null; then
    ARCH=$(uname -m)
    [[ "$ARCH" == "x86_64" ]] && NATS_ARCH="amd64" || NATS_ARCH="arm64"
    NATS_URL="https://github.com/nats-io/nats-server/releases/download/v${NATS_VERSION}/nats-server-v${NATS_VERSION}-linux-${NATS_ARCH}.tar.gz"
    log "  Downloading NATS ${NATS_VERSION} for ${ARCH}..."
    wget -q "$NATS_URL" -O /tmp/nats.tar.gz 2>>"$LOG_FILE" \
        || fail "Cannot download NATS. Check: is your WSL internet working? Try: curl https://google.com"
    tar -xzf /tmp/nats.tar.gz -C /tmp 2>>"$LOG_FILE"
    sudo mv "/tmp/nats-server-v${NATS_VERSION}-linux-${NATS_ARCH}/nats-server" /usr/local/bin/
    sudo chmod +x /usr/local/bin/nats-server
    rm -rf /tmp/nats.tar.gz "/tmp/nats-server-v${NATS_VERSION}-linux-${NATS_ARCH}"
    log "  NATS installed: $(nats-server --version)"
else
    log "  NATS already installed: $(nats-server --version)"
fi

# NATS config and data directory
mkdir -p "${INSTALL_DIR}/nats-data"
cat > "${INSTALL_DIR}/nats-server.conf" << EOF
port:      4222
http_port: 8222

jetstream {
    store_dir:        ${INSTALL_DIR}/nats-data
    max_memory_store: 256MB
    max_file_store:   2GB
}
EOF
log "  NATS configured"

# ── Step 5: ClickHouse schema ─────────────────────────────────
section "Step 5/7 — ClickHouse schema"

# Start ClickHouse temporarily to run schema
log "  Starting ClickHouse to apply schema..."
sudo clickhouse-server --config=/etc/clickhouse-server/config.xml --daemon \
    --pid-file=/tmp/clickhouse-install.pid 2>>"$LOG_FILE" || true
sleep 5

for i in {1..20}; do
    curl -sf "http://localhost:8123/ping" &>/dev/null && break
    sleep 1
    [[ $i -eq 20 ]] && fail "ClickHouse would not start for schema setup. Check: /var/log/clickhouse-server/clickhouse-server.err.log"
done

clickhouse-client \
    --user medishield \
    --password "${CLICKHOUSE_PASSWORD}" \
    --query "CREATE DATABASE IF NOT EXISTS medishield" 2>>"$LOG_FILE"

clickhouse-client \
    --user medishield \
    --password "${CLICKHOUSE_PASSWORD}" \
    --database medishield \
    --multiquery < "${INSTALL_DIR}/scripts/clickhouse_schema.sql" 2>>"$LOG_FILE"

# Stop temporary instance — will be started cleanly by 02_start.sh
sudo pkill -f "clickhouse-server" 2>/dev/null || true
sleep 2
log "  ClickHouse schema applied"

# ── Step 6: Python venv ───────────────────────────────────────
section "Step 6/7 — Python virtual environment"

[[ -d "${INSTALL_DIR}/venv" ]] && rm -rf "${INSTALL_DIR}/venv"

$PYTHON_BIN -m venv "${INSTALL_DIR}/venv" 2>>"$LOG_FILE"
source "${INSTALL_DIR}/venv/bin/activate"
pip install --upgrade pip -q 2>>"$LOG_FILE"

log "  Installing Python packages (2-4 min first time)..."
pip install -q -r "${INSTALL_DIR}/backend/requirements.txt" 2>>"$LOG_FILE" \
    || fail "pip install failed. See: $LOG_FILE"

deactivate
log "  Python venv ready"

# ── Step 7: Environment file ──────────────────────────────────
section "Step 7/7 — Configuration"

SECRET_KEY=$(${INSTALL_DIR}/venv/bin/python3 \
    -c "import secrets; print(secrets.token_hex(32))")

cat > "${INSTALL_DIR}/backend/.env" << EOF
APP_NAME=MediShield SOC
APP_VERSION=1.0.0
DEBUG=false
SECRET_KEY=${SECRET_KEY}
DATABASE_URL=postgresql+asyncpg://medishield:${POSTGRES_PASSWORD}@127.0.0.1:5432/medishield
CLICKHOUSE_HOST=127.0.0.1
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=medishield
CLICKHOUSE_PASSWORD=${CLICKHOUSE_PASSWORD}
CLICKHOUSE_DB=medishield
NATS_URL=nats://127.0.0.1:4222
INTERNAL_API_KEY=ms_internal_key_2024
SLA_L1_RESPONSE=900
SLA_L2_RESPONSE=3600
SLA_L3_RESPONSE=300
CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000","http://localhost:8080"]
EOF

chmod 600 "${INSTALL_DIR}/backend/.env"

# Save install state for start script
cat > "${INSTALL_DIR}/.install_state" << EOF
INSTALL_DIR=${INSTALL_DIR}
PYTHON_BIN=${INSTALL_DIR}/venv/bin/python3
PG_VERSION=${PG_VERSION}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
CLICKHOUSE_PASSWORD=${CLICKHOUSE_PASSWORD}
INSTALLED_AT=$(date '+%Y-%m-%d %H:%M:%S')
EOF

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN} Installation complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  OS:      $PRETTY_NAME (WSL)"
echo "  Python:  $($PYTHON_BIN --version)"
echo "  Dir:     $INSTALL_DIR"
echo ""
echo "  Run next:"
echo ""
echo "    bash ${INSTALL_DIR}/scripts/02_start.sh"
echo "    bash ${INSTALL_DIR}/scripts/03_seed.sh"
echo "    bash ${INSTALL_DIR}/scripts/04_smoke_test.sh"
echo ""
echo "  API docs (open in Windows browser):"
echo "    http://localhost:8000/api/docs"
echo ""
