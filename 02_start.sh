#!/usr/bin/env bash
# MediShield SOC — WSL Start Script
# Starts all services as background processes (no systemd/systemctl)
# Usage: bash scripts/02_start.sh
set -euo pipefail

INSTALL_DIR="/opt/medishield"
LOG_DIR="${INSTALL_DIR}/logs"
PID_DIR="${INSTALL_DIR}/pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()      { echo -e "  ${GREEN}✓${NC}  $*"; }
fail()    { echo -e "  ${RED}✗${NC}  $*"; }
warn()    { echo -e "  ${YELLOW}!${NC}  $*"; }
section() { echo -e "\n${CYAN}── $* ──${NC}"; }

# Load install state
[[ -f "${INSTALL_DIR}/.install_state" ]] && source "${INSTALL_DIR}/.install_state" \
    || { echo "Run 01_install.sh first"; exit 1; }

echo ""
echo "Starting MediShield SOC services..."

# ── Helper: check if process is running by PID file ──────────
is_running() {
    local pidfile="$1"
    [[ -f "$pidfile" ]] && kill -0 "$(cat "$pidfile")" 2>/dev/null
}

wait_for_port() {
    local port=$1 name=$2 secs=${3:-20}
    for i in $(seq 1 "$secs"); do
        if nc -z 127.0.0.1 "$port" 2>/dev/null; then return 0; fi
        sleep 1
    done
    return 1
}

# ── 1. PostgreSQL ─────────────────────────────────────────────
section "PostgreSQL"

if pg_isready -q 2>/dev/null; then
    ok "PostgreSQL already running"
else
    pg_ctlcluster "$PG_VERSION" main start 2>>"${LOG_DIR}/postgres.log" || true
    sleep 2
    if wait_for_port 5432 "PostgreSQL" 15; then
        ok "PostgreSQL started"
    else
        fail "PostgreSQL failed to start"
        echo "    Check: pg_ctlcluster $PG_VERSION main status"
        echo "    Log:   /var/log/postgresql/"
        exit 1
    fi
fi

# ── 2. ClickHouse ─────────────────────────────────────────────
section "ClickHouse"

CH_PID="${PID_DIR}/clickhouse.pid"

if is_running "$CH_PID"; then
    ok "ClickHouse already running (pid $(cat "$CH_PID"))"
else
    # Kill any orphan instance
    pkill -f "clickhouse-server" 2>/dev/null || true
    sleep 1

    sudo clickhouse-server \
        --config=/etc/clickhouse-server/config.xml \
        --daemon \
        --pid-file="$CH_PID" \
        >> "${LOG_DIR}/clickhouse.log" 2>&1 || true

    if wait_for_port 8123 "ClickHouse" 25; then
        ok "ClickHouse started (pid $(cat "$CH_PID" 2>/dev/null || echo '?'))"
    else
        fail "ClickHouse failed to start"
        echo "    Log: /var/log/clickhouse-server/clickhouse-server.err.log"
        echo "    Or:  ${LOG_DIR}/clickhouse.log"
        exit 1
    fi
fi

# ── 3. NATS ───────────────────────────────────────────────────
section "NATS JetStream"

NATS_PID="${PID_DIR}/nats.pid"

if is_running "$NATS_PID"; then
    ok "NATS already running (pid $(cat "$NATS_PID"))"
else
    pkill -f "nats-server" 2>/dev/null || true
    sleep 1

    nats-server \
        -c "${INSTALL_DIR}/nats-server.conf" \
        -P "$NATS_PID" \
        >> "${LOG_DIR}/nats.log" 2>&1 &

    if wait_for_port 4222 "NATS" 15; then
        ok "NATS started (pid $(cat "$NATS_PID" 2>/dev/null || echo '?'))"
    else
        fail "NATS failed to start"
        echo "    Log: ${LOG_DIR}/nats.log"
        exit 1
    fi
fi

# ── 4. MediShield API ─────────────────────────────────────────
section "MediShield API"

API_PID="${PID_DIR}/api.pid"

# Stop previous instance
if is_running "$API_PID"; then
    warn "API already running — restarting..."
    kill "$(cat "$API_PID")" 2>/dev/null || true
    sleep 2
fi

cd "${INSTALL_DIR}/backend"

"${INSTALL_DIR}/venv/bin/uvicorn" app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 2 \
    --log-level info \
    >> "${LOG_DIR}/api.log" 2>&1 &
echo $! > "$API_PID"

if wait_for_port 8000 "API" 30; then
    # Verify health endpoint
    if curl -sf "http://localhost:8000/health" &>/dev/null; then
        ok "MediShield API started (pid $(cat "$API_PID"))"
    else
        fail "API port open but /health returned error"
        echo "    Log: ${LOG_DIR}/api.log"
        tail -20 "${LOG_DIR}/api.log"
        exit 1
    fi
else
    fail "MediShield API failed to start within 30s"
    echo "    Log: ${LOG_DIR}/api.log"
    tail -30 "${LOG_DIR}/api.log"
    exit 1
fi

# ── 5. Detection Engine ───────────────────────────────────────
section "Detection Engine"

DET_PID="${PID_DIR}/detection.pid"

if is_running "$DET_PID"; then
    warn "Detection engine already running — restarting..."
    kill "$(cat "$DET_PID")" 2>/dev/null || true
    sleep 2
fi

"${INSTALL_DIR}/venv/bin/python3" \
    "${INSTALL_DIR}/backend/detection_engine.py" \
    >> "${LOG_DIR}/detection.log" 2>&1 &
echo $! > "$DET_PID"

sleep 3
if is_running "$DET_PID"; then
    ok "Detection engine started (pid $(cat "$DET_PID"))"
else
    fail "Detection engine crashed immediately"
    echo "    Log: ${LOG_DIR}/detection.log"
    tail -20 "${LOG_DIR}/detection.log"
    exit 1
fi

# ── Summary ───────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN} All services running${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Service           Port    Log"
echo "  ──────────────    ────    ─────────────────────────────"
echo "  PostgreSQL        5432    /var/log/postgresql/"
echo "  ClickHouse        8123    ${LOG_DIR}/clickhouse.log"
echo "  NATS              4222    ${LOG_DIR}/nats.log"
echo "  MediShield API    8000    ${LOG_DIR}/api.log"
echo "  Detection Engine  —       ${LOG_DIR}/detection.log"
echo ""
echo "  Open in your Windows browser:"
echo "    http://localhost:8000/api/docs"
echo "    http://localhost:8222           (NATS monitor)"
echo ""
echo "  Follow logs:"
echo "    tail -f ${LOG_DIR}/api.log"
echo "    tail -f ${LOG_DIR}/detection.log"
echo ""
echo "  Stop everything:"
echo "    bash ${INSTALL_DIR}/scripts/05_stop.sh"
echo ""
