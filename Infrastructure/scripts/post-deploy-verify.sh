#!/usr/bin/env bash
# WP-03 — Post-deploy verification: polls health/readiness/metrics/frontend
# with retries. Reusable standalone against any live stack, or called by
# deploy.sh right after `docker compose up -d`.
#
# Checks go through nginx (the only container published to the host in
# docker-compose.production.yml) by default, since that's the real path a
# client/monitor takes and it also proves nginx's own proxy_pass routing —
# not just that ai-backend/frontend are up in isolation. Point EDGE_URL at
# a service directly (e.g. http://localhost:3001) if you've temporarily
# published its port for debugging.
set -u

EDGE_URL="${EDGE_URL:-https://localhost}"
CURL_INSECURE="${CURL_INSECURE:-1}"   # nginx.conf uses a self-signed cert unless a real one is mounted
RETRIES="${VERIFY_RETRIES:-10}"
RETRY_DELAY_SECONDS="${VERIFY_RETRY_DELAY_SECONDS:-3}"

curl_flags="-s"
[ "$CURL_INSECURE" = "1" ] && curl_flags="$curl_flags -k"

fail_count=0

check_endpoint() {
  name="$1"
  url="$2"
  expect_status="${3:-200}"
  attempt=1
  while [ "$attempt" -le "$RETRIES" ]; do
    # shellcheck disable=SC2086
    status="$(curl $curl_flags -o /tmp/wp03-verify-body -w '%{http_code}' "$url" 2>/dev/null)"
    if [ "$status" = "$expect_status" ]; then
      echo "[PASS] $name ($url) -> $status"
      return 0
    fi
    attempt=$((attempt + 1))
    sleep "$RETRY_DELAY_SECONDS"
  done
  echo "[FAIL] $name ($url) -> last status: ${status:-no response}, expected $expect_status"
  if [ -f /tmp/wp03-verify-body ]; then
    echo "       body: $(head -c 500 /tmp/wp03-verify-body)"
  fi
  fail_count=$((fail_count + 1))
  return 1
}

echo "== WP-03 post-deploy verification (edge: $EDGE_URL) =="
check_endpoint "backend health"    "$EDGE_URL/health"
check_endpoint "backend readiness" "$EDGE_URL/readiness"
check_endpoint "backend metrics"   "$EDGE_URL/metrics"
check_endpoint "frontend"          "$EDGE_URL/"

echo
if [ "$fail_count" -gt 0 ]; then
  echo "== verification FAILED: $fail_count check(s) did not pass =="
  exit 1
fi
echo "== verification PASSED =="
exit 0
