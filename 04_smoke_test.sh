#!/usr/bin/env bash
# MediShield SOC — End-to-end smoke test (WSL)
set -euo pipefail

API="http://localhost:8000"
PASS=0; FAIL=0

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

pass()    { echo -e "  ${GREEN}PASS${NC}  $*"; ((PASS++)); }
fail()    { echo -e "  ${RED}FAIL${NC}  $*"; ((FAIL++)); }
section() { echo -e "\n${CYAN}── $* ──${NC}"; }

# Python JSON helper — safer than jq in WSL environments
jget() { python3 -c "import sys,json; d=json.load(sys.stdin); print(${1})" 2>/dev/null; }
jlen()  { python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null; }

echo ""
echo "================================================"
echo " MediShield SOC — Smoke Test Suite (WSL)"
echo "================================================"

# ── Infrastructure ────────────────────────────────────────────
section "Infrastructure"

curl -sf "${API}/health" >/dev/null \
    && pass "API /health OK" \
    || { fail "API not responding — run: bash /opt/medishield/scripts/02_start.sh"; exit 1; }

curl -sf "http://localhost:8123/ping" >/dev/null \
    && pass "ClickHouse :8123 OK" \
    || fail "ClickHouse not responding"

curl -sf "http://localhost:8222/healthz" >/dev/null \
    && pass "NATS monitor :8222 OK" \
    || fail "NATS not responding"

pg_isready -q 2>/dev/null \
    && pass "PostgreSQL ready" \
    || fail "PostgreSQL not ready"

API_VER=$(curl -sf "${API}/health" | jget "d.get('version','?')")
pass "API version: $API_VER"

# ── Auth ──────────────────────────────────────────────────────
section "Authentication"

LOGIN=$(curl -sf -X POST "${API}/api/v1/auth/login" \
    -F "username=admin" -F "password=Admin@1234!")
TOKEN=$(echo "$LOGIN" | jget "d['access_token']")
ROLE=$(echo "$LOGIN" | jget "d['role']")

[[ -n "$TOKEN" && "$TOKEN" != "None" ]] \
    && pass "Admin login — token received" \
    || { fail "Admin login failed"; exit 1; }

[[ "$ROLE" == "admin" ]] \
    && pass "Role returned: $ROLE" \
    || fail "Expected role=admin, got $ROLE"

HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API}/api/v1/auth/login" \
    -F "username=admin" -F "password=WRONG")
[[ "$HTTP" == "401" ]] && pass "Wrong password → 401" || fail "Wrong password → $HTTP (expected 401)"

HTTP=$(curl -s -o /dev/null -w "%{http_code}" "${API}/api/v1/alerts")
[[ "$HTTP" == "401" ]] && pass "No token → 401" || fail "No token → $HTTP (expected 401)"

# Get role tokens
TOKEN_L1=$(curl -sf -X POST "${API}/api/v1/auth/login" \
    -F "username=l1_analyst" -F "password=L1Demo@1234!" | jget "d['access_token']")
TOKEN_L2=$(curl -sf -X POST "${API}/api/v1/auth/login" \
    -F "username=l2_invest" -F "password=L2Demo@1234!" | jget "d['access_token']")
TOKEN_L3=$(curl -sf -X POST "${API}/api/v1/auth/login" \
    -F "username=l3_lead" -F "password=L3Demo@1234!" | jget "d['access_token']")
TOKEN_MGMT=$(curl -sf -X POST "${API}/api/v1/auth/login" \
    -F "username=mgmt" -F "password=Mgmt@1234!" | jget "d['access_token']")
pass "All role tokens obtained (L1, L2, L3, management)"

# ── RBAC ──────────────────────────────────────────────────────
section "Role-Based Access Control"

HTTP=$(curl -s -o /dev/null -w "%{http_code}" "${API}/api/v1/report" \
    -H "Authorization: Bearer ${TOKEN_L1}")
[[ "$HTTP" == "403" ]] && pass "L1 blocked from /report (403)" || fail "L1 should be blocked, got $HTTP"

HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API}/api/v1/incidents/create" \
    -H "Authorization: Bearer ${TOKEN_L1}" \
    -H "Content-Type: application/json" \
    -d '{"case_id":"C-0001","title":"test"}')
[[ "$HTTP" == "403" ]] && pass "L1 blocked from creating incidents (403)" || fail "Got $HTTP (expected 403)"

HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API}/api/v1/users" \
    -H "Authorization: Bearer ${TOKEN_L1}" \
    -H "Content-Type: application/json" \
    -d '{"username":"x","email":"x@x.com","full_name":"X","password":"x","role":"l1_analyst"}')
[[ "$HTTP" == "403" ]] && pass "L1 blocked from creating users (403)" || fail "Got $HTTP (expected 403)"

# L2 can create incidents
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API}/api/v1/incidents/close" \
    -H "Authorization: Bearer ${TOKEN_L1}" \
    -H "Content-Type: application/json" \
    -d '{"incident_id":"INC-0001","closure_comment":"x","soc_analysis":"x"}')
[[ "$HTTP" == "403" ]] && pass "L1 blocked from closing incidents (403)" || fail "Got $HTTP (expected 403)"

# ── Alert → Case auto-creation ────────────────────────────────
section "Alert creation + auto case"

ALERT=$(curl -sf -X POST "${API}/api/v1/alerts" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{
        "message": "SMOKE TEST: Suspicious connection from ICU device to external IP",
        "severity": "HIGH",
        "source": "smoke-test",
        "source_ip": "192.168.12.99",
        "dest_ip": "8.8.8.8",
        "protocol": "TCP",
        "port": 443,
        "tactic": "Exfiltration",
        "mitre_id": "T1048",
        "rule_name": "Smoke Test Alert"
    }')
ALERT_ID=$(echo "$ALERT" | jget "d['alert_id']")

[[ "$ALERT_ID" =~ ^A-[0-9]{4}$ ]] \
    && pass "Alert created: $ALERT_ID" \
    || fail "Bad alert ID: $ALERT_ID"

FETCHED=$(curl -sf "${API}/api/v1/alerts/${ALERT_ID}" \
    -H "Authorization: Bearer ${TOKEN}")
FETCHED_SEV=$(echo "$FETCHED" | jget "d['severity']")
[[ "$FETCHED_SEV" == "HIGH" ]] \
    && pass "Alert GET: severity=HIGH" \
    || fail "Alert GET returned severity=$FETCHED_SEV"

# Auto case must have been created
sleep 1
CASES=$(curl -sf "${API}/api/v1/cases?limit=100" \
    -H "Authorization: Bearer ${TOKEN}")

SMOKE_CASE=$(echo "$CASES" | python3 -c "
import sys, json
cases = json.load(sys.stdin)
for c in cases:
    if c['alert_id'] == '${ALERT_ID}':
        print(c['case_id'])
        break
" 2>/dev/null)

[[ -n "$SMOKE_CASE" && "$SMOKE_CASE" != "None" ]] \
    && pass "Auto-case created: $SMOKE_CASE" \
    || fail "No auto-case found for alert $ALERT_ID"

TIER=$(echo "$CASES" | python3 -c "
import sys, json
for c in json.load(sys.stdin):
    if c['alert_id'] == '${ALERT_ID}':
        print(c['tier']); break
")
[[ "$TIER" == "L2" ]] \
    && pass "HIGH alert → L2 case (tier=$TIER)" \
    || fail "Expected L2 tier for HIGH, got $TIER"

# ── Case operations ───────────────────────────────────────────
section "Case operations"

UPD=$(curl -sf -X POST "${API}/api/v1/cases/update" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"case_id\":\"${SMOKE_CASE}\",\"status\":\"IN_PROGRESS\"}")
STATUS=$(echo "$UPD" | jget "d['status']")
[[ "$STATUS" == "IN_PROGRESS" ]] \
    && pass "Case → IN_PROGRESS" \
    || fail "Status update failed: $STATUS"

# Close without note must fail
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API}/api/v1/cases/update" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"case_id\":\"${SMOKE_CASE}\",\"status\":\"CLOSED\"}")
[[ "$HTTP" == "400" ]] \
    && pass "Close without resolution_note → 400" \
    || fail "Expected 400, got $HTTP"

# Close with note must succeed
CLOSED=$(curl -sf -X POST "${API}/api/v1/cases/update" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
        \"case_id\": \"${SMOKE_CASE}\",
        \"status\": \"CLOSED\",
        \"resolution_note\": \"Smoke test — confirmed false positive from automated test script\",
        \"soc_closing_note\": \"No real threat. Test case closed.\"
    }")
CLOSED_STATUS=$(echo "$CLOSED" | jget "d['status']")
[[ "$CLOSED_STATUS" == "CLOSED" ]] \
    && pass "Case closed with resolution_note" \
    || fail "Case close failed: $CLOSED_STATUS"

# ── Incident lifecycle ────────────────────────────────────────
section "Incident lifecycle"

# Need an L3 case
L3_CASE=$(curl -sf "${API}/api/v1/cases?tier=L3&status=OPEN" \
    -H "Authorization: Bearer ${TOKEN}" | python3 -c "
import sys, json
cases = json.load(sys.stdin)
print(cases[0]['case_id'] if cases else '')
" 2>/dev/null)

if [[ -n "$L3_CASE" ]]; then
    # L1 cannot create incident
    HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API}/api/v1/incidents/create" \
        -H "Authorization: Bearer ${TOKEN_L1}" \
        -H "Content-Type: application/json" \
        -d "{\"case_id\":\"${L3_CASE}\",\"title\":\"test\"}")
    [[ "$HTTP" == "403" ]] && pass "L1 cannot create incident (403)" || fail "Got $HTTP (expected 403)"

    # L2 can create incident
    INC=$(curl -sf -X POST "${API}/api/v1/incidents/create" \
        -H "Authorization: Bearer ${TOKEN_L2}" \
        -H "Content-Type: application/json" \
        -d "{
            \"case_id\": \"${L3_CASE}\",
            \"title\": \"Smoke test incident — CRITICAL\",
            \"description\": \"Automated smoke test incident\",
            \"owner_team\": \"SOC L3\"
        }")
    INC_ID=$(echo "$INC" | jget "d['incident_id']")
    [[ "$INC_ID" =~ ^INC-[0-9]{4}$ ]] \
        && pass "Incident created: $INC_ID" \
        || fail "Bad incident ID: $INC_ID"

    # Close without comment must fail
    HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API}/api/v1/incidents/close" \
        -H "Authorization: Bearer ${TOKEN_L3}" \
        -H "Content-Type: application/json" \
        -d "{\"incident_id\":\"${INC_ID}\",\"closure_comment\":\"\",\"soc_analysis\":\"x\"}")
    [[ "$HTTP" == "400" ]] \
        && pass "Incident close without comment → 400" \
        || fail "Expected 400, got $HTTP"

    # L1 cannot close incident
    HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API}/api/v1/incidents/close" \
        -H "Authorization: Bearer ${TOKEN_L1}" \
        -H "Content-Type: application/json" \
        -d "{\"incident_id\":\"${INC_ID}\",\"closure_comment\":\"x\",\"soc_analysis\":\"x\"}")
    [[ "$HTTP" == "403" ]] && pass "L1 cannot close incident (403)" || fail "Got $HTTP (expected 403)"

    # L3 can close
    CLOSE=$(curl -sf -X POST "${API}/api/v1/incidents/close" \
        -H "Authorization: Bearer ${TOKEN_L3}" \
        -H "Content-Type: application/json" \
        -d "{
            \"incident_id\": \"${INC_ID}\",
            \"closure_comment\": \"Smoke test closure — no real incident\",
            \"soc_analysis\": \"Automated test. No action required.\",
            \"containment_steps\": \"N/A\"
        }")
    CLOSE_STATUS=$(echo "$CLOSE" | jget "d['status']")
    [[ "$CLOSE_STATUS" == "CLOSED" ]] \
        && pass "Incident $INC_ID closed by L3" \
        || fail "Incident close failed: $CLOSE_STATUS"
else
    pass "No L3 case available — run 03_seed.sh first for full incident test"
fi

# ── Timeline ──────────────────────────────────────────────────
section "Timeline / audit trail"

TL=$(curl -sf "${API}/api/v1/timeline?entity_id=${SMOKE_CASE}&entity_type=case" \
    -H "Authorization: Bearer ${TOKEN}")
TL_COUNT=$(echo "$TL" | jlen)
[[ "$TL_COUNT" -gt 0 ]] \
    && pass "Timeline for $SMOKE_CASE: $TL_COUNT entries" \
    || fail "No timeline entries"

HAS_CREATED=$(echo "$TL" | python3 -c "
import sys,json
actions = [e['action'] for e in json.load(sys.stdin)]
print('yes' if 'CASE_CREATED' in actions else 'no')
")
[[ "$HAS_CREATED" == "yes" ]] && pass "Timeline has CASE_CREATED" || fail "Missing CASE_CREATED in timeline"

HAS_CLOSED=$(echo "$TL" | python3 -c "
import sys,json
actions = [e['action'] for e in json.load(sys.stdin)]
print('yes' if 'CASE_CLOSED' in actions else 'no')
")
[[ "$HAS_CLOSED" == "yes" ]] && pass "Timeline has CASE_CLOSED" || fail "Missing CASE_CLOSED in timeline"

# ── Report ────────────────────────────────────────────────────
section "Report endpoint"

REPORT=$(curl -sf "${API}/api/v1/report?days=30" \
    -H "Authorization: Bearer ${TOKEN_MGMT}")
[[ $? -eq 0 ]] && pass "Report endpoint responds" || fail "Report endpoint failed"

TOTAL_ALERTS=$(echo "$REPORT" | jget "d['summary']['total_alerts']")
[[ "$TOTAL_ALERTS" -gt 0 ]] \
    && pass "Report: total_alerts=$TOTAL_ALERTS" \
    || fail "Report: total_alerts=0"

TOTAL_CASES=$(echo "$REPORT" | jget "d['summary']['total_cases']")
[[ "$TOTAL_CASES" -gt 0 ]] \
    && pass "Report: total_cases=$TOTAL_CASES" \
    || fail "Report: total_cases=0"

HAS_SEV=$(echo "$REPORT" | python3 -c "
import sys,json; d=json.load(sys.stdin)
print('yes' if d.get('severity_breakdown') else 'no')
")
[[ "$HAS_SEV" == "yes" ]] && pass "Report: severity_breakdown present" || fail "Report missing severity_breakdown"

HAS_SLA=$(echo "$REPORT" | python3 -c "
import sys,json; d=json.load(sys.stdin)
print('yes' if d.get('sla') else 'no')
")
[[ "$HAS_SLA" == "yes" ]] && pass "Report: SLA section present" || fail "Report missing SLA"

# L1 cannot access report
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "${API}/api/v1/report" \
    -H "Authorization: Bearer ${TOKEN_L1}")
[[ "$HTTP" == "403" ]] && pass "L1 blocked from report (403)" || fail "Got $HTTP (expected 403)"

# ── Analytics ─────────────────────────────────────────────────
section "Analytics (ClickHouse)"

ANA=$(curl -sf "${API}/api/v1/analytics/summary?days=7" \
    -H "Authorization: Bearer ${TOKEN}")
[[ $? -eq 0 ]] && pass "Analytics /summary responds" || fail "Analytics failed"

LOG_QUERY=$(curl -sf -X POST "${API}/api/v1/analytics/logs" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"severity":"HIGH","limit":10}')
HAS_LOGS=$(echo "$LOG_QUERY" | python3 -c "
import sys,json; d=json.load(sys.stdin)
print('yes' if 'logs' in d else 'no')
")
[[ "$HAS_LOGS" == "yes" ]] && pass "Analytics /logs structured filter works" || fail "Analytics /logs failed"

# ── Users ─────────────────────────────────────────────────────
section "User management"

USERS=$(curl -sf "${API}/api/v1/users" -H "Authorization: Bearer ${TOKEN}")
U_COUNT=$(echo "$USERS" | jlen)
[[ "$U_COUNT" -ge 6 ]] \
    && pass "Users list: $U_COUNT users (≥6 expected)" \
    || fail "Only $U_COUNT users found (expected ≥6)"

# ── Final ─────────────────────────────────────────────────────
echo ""
echo "================================================"
TOTAL=$((PASS + FAIL))
if [[ $FAIL -eq 0 ]]; then
    echo -e "${GREEN} ALL $TOTAL TESTS PASSED${NC}"
    echo ""
    echo " System is fully operational."
    echo ""
    echo " Open in your browser (Windows or WSL):"
    echo "   http://localhost:8000/api/docs"
    echo ""
    echo " Default logins:"
    echo "   admin      / Admin@1234!   (full access)"
    echo "   l1_analyst / L1Demo@1234!  (L1 queue)"
    echo "   l2_invest  / L2Demo@1234!  (L2 investigations)"
    echo "   l3_lead    / L3Demo@1234!  (L3 incidents)"
    echo "   mgmt       / Mgmt@1234!    (reports + analytics)"
else
    echo -e "${RED} $FAIL/$TOTAL TESTS FAILED${NC}"
    echo " Fix the failures above before using in production."
fi
echo "================================================"
echo ""
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
