#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Check All APIs (VPS)
# - Logs in once (super-admin or regular email login)
# - Calls a curated list of important GET endpoints
# - Optionally "discover" safe GET /api/* routes from server/routes.ts (skips :params)
#
# Usage examples:
#   ./check-all-apis.sh \
#     --base http://127.0.0.1:3000 \
#     --mode super-admin \
#     --email admin@hostezee.in \
#     --password 'admin@123'
#
#   ./check-all-apis.sh --base http://127.0.0.1:3000 --mode super-admin --email ... --password ... --discover
#
# Notes:
# - Requires: curl, node
# - Uses cookie jar (connect.sid) for session auth
# =============================================================================

BASE_URL=""
MODE="super-admin"  # super-admin | email
EMAIL=""
PASSWORD=""
DISCOVER="false"
PROPERTY_ID=""      # optional: used for endpoints that require propertyId

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base) BASE_URL="${2:-}"; shift 2;;
    --mode) MODE="${2:-}"; shift 2;;
    --email) EMAIL="${2:-}"; shift 2;;
    --password) PASSWORD="${2:-}"; shift 2;;
    --discover) DISCOVER="true"; shift 1;;
    --property-id) PROPERTY_ID="${2:-}"; shift 2;;
    -h|--help)
      sed -n '1,120p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "${BASE_URL}" || -z "${EMAIL}" || -z "${PASSWORD}" ]]; then
  echo "Missing required args. Example:" >&2
  echo "  $0 --base http://127.0.0.1:3000 --mode super-admin --email admin@hostezee.in --password 'admin@123' [--discover]" >&2
  exit 2
fi

COOKIE_JAR="$(mktemp)"
trap 'rm -f "${COOKIE_JAR}"' EXIT

function hr() { printf '%*s\n' 90 '' | tr ' ' '-'; }

function http_code() {
  local method="$1" url="$2" data="${3:-}"
  if [[ -n "${data}" ]]; then
    curl -sS -o /dev/null -w "%{http_code}" \
      -X "${method}" \
      -H "Content-Type: application/json" \
      -b "${COOKIE_JAR}" -c "${COOKIE_JAR}" \
      --data "${data}" \
      "${url}"
  else
    curl -sS -o /dev/null -w "%{http_code}" \
      -X "${method}" \
      -b "${COOKIE_JAR}" -c "${COOKIE_JAR}" \
      "${url}"
  fi
}

LOGIN_PATH="/api/auth/super-admin-login"
if [[ "${MODE}" == "email" ]]; then
  LOGIN_PATH="/api/auth/email-login"
fi

echo "== API CHECK =="
echo "Base: ${BASE_URL}"
echo "Mode: ${MODE}"
echo "Discover extra routes: ${DISCOVER}"
echo

echo "[1/3] Login: ${LOGIN_PATH}"
LOGIN_CODE="$(http_code "POST" "${BASE_URL}${LOGIN_PATH}" "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")"
if [[ "${LOGIN_CODE}" != "200" ]]; then
  echo "❌ Login failed. HTTP ${LOGIN_CODE}"
  echo "Tip: super-admin must use /api/auth/super-admin-login"
  exit 1
fi
echo "✅ Login OK"
echo

echo "[2/3] Core API checks"

# Curated endpoints (safe GETs). Some might return 400 if missing required query; we still print it.
declare -a ENDPOINTS=(
  "/api/auth/user"
  "/api/notifications"
  "/api/properties"
  "/api/rooms"
  "/api/guests"
  "/api/bookings"
  "/api/bills"
  "/api/wallets"
  "/api/expense-categories"
  "/api/vendors"
  "/api/travel-agents"
  "/api/staff"
  "/api/sessions"
  "/api/user-permissions"
  "/api/activity-logs"
  "/api/audit-logs"
  "/api/tasks"
  "/api/feature-settings"
  "/api/super-admin/system-health"
  "/api/super-admin/dashboard"
)

if [[ -n "${PROPERTY_ID}" ]]; then
  ENDPOINTS+=(
    "/api/vendors?propertyId=${PROPERTY_ID}"
    "/api/expenses?propertyId=${PROPERTY_ID}"
    "/api/bookings?propertyId=${PROPERTY_ID}"
    "/api/rooms?propertyId=${PROPERTY_ID}"
  )
fi

printf "%-60s  %-6s\n" "ENDPOINT" "HTTP"
hr
fail_count=0
for ep in "${ENDPOINTS[@]}"; do
  code="$(http_code "GET" "${BASE_URL}${ep}")" || code="000"
  printf "%-60s  %-6s\n" "${ep}" "${code}"
  # Consider 200/204/304 as pass; anything else is a fail (but still listed)
  if [[ "${code}" != "200" && "${code}" != "204" && "${code}" != "304" ]]; then
    fail_count=$((fail_count+1))
  fi
done
hr
echo "Core checks failing: ${fail_count}"
echo

echo "[3/3] Optional discovery checks"
if [[ "${DISCOVER}" == "true" ]]; then
  if [[ ! -f "server/routes.ts" ]]; then
    echo "⚠️  server/routes.ts not found in current directory. Run from /var/www/myapp"
    exit 1
  fi

  # Extract GET /api/... routes without path params
  mapfile -t DISCOVERED < <(
    node -e '
      const fs=require("fs");
      const txt=fs.readFileSync("server/routes.ts","utf8");
      const re=/app\.get\("([^"]+)"\s*,/g;
      const out=new Set();
      let m;
      while((m=re.exec(txt))){
        const p=m[1];
        if(!p.startsWith("/api/")) continue;
        if(p.includes(":")) continue;     // skip param routes
        if(p.includes("*")) continue;
        out.add(p);
      }
      console.log([...out].sort().join("\n"));
    '
  )

  if [[ ${#DISCOVERED[@]} -eq 0 ]]; then
    echo "No discovered GET routes."
    exit 0
  fi

  printf "%-60s  %-6s\n" "DISCOVERED GET" "HTTP"
  hr
  disc_fail=0
  for ep in "${DISCOVERED[@]}"; do
    code="$(http_code "GET" "${BASE_URL}${ep}")" || code="000"
    printf "%-60s  %-6s\n" "${ep}" "${code}"
    if [[ "${code}" != "200" && "${code}" != "204" && "${code}" != "304" ]]; then
      disc_fail=$((disc_fail+1))
    fi
  done
  hr
  echo "Discovery checks failing: ${disc_fail}"
else
  echo "Skipped (run with --discover)"
fi

echo
echo "✅ Done"

