#!/usr/bin/env bash
# WP-03 — Pre-deploy checks for docker-compose.production.yml.
# Exits non-zero on any hard failure so deploy.sh aborts before touching running containers.
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.production.yml}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
MIN_FREE_DISK_MB="${MIN_FREE_DISK_MB:-2048}"

REQUIRED_VARS="MONGO_ROOT_USER MONGO_ROOT_PASSWORD REDIS_PASSWORD JWT_SECRET REFRESH_SECRET CORS_ORIGIN NEXT_PUBLIC_BACKEND_URL"

fail_count=0
warn_count=0

fail() { echo "[FAIL] $1"; fail_count=$((fail_count + 1)); }
pass() { echo "[PASS] $1"; }
warn() { echo "[WARN] $1"; warn_count=$((warn_count + 1)); }

echo "== WP-03 pre-deploy check =="
echo "compose file: $COMPOSE_FILE"
echo "env file:     $ENV_FILE"
echo

# 1. CLI availability
if command -v docker >/dev/null 2>&1; then
  pass "docker CLI present ($(docker --version))"
else
  fail "docker CLI not found on PATH"
fi

if docker compose version >/dev/null 2>&1; then
  pass "docker compose plugin present ($(docker compose version --short 2>/dev/null || docker compose version))"
else
  fail "docker compose plugin not available"
fi

# 2. Compose file exists and parses
if [ ! -f "$COMPOSE_FILE" ]; then
  fail "compose file not found: $COMPOSE_FILE"
else
  pass "compose file exists"
fi

# 3. Env file exists and required vars are set
if [ ! -f "$ENV_FILE" ]; then
  fail "env file not found: $ENV_FILE (copy .env.example or provision via secret manager)"
else
  pass "env file exists"
  # shellcheck disable=SC1090
  set -a
  . "$ENV_FILE"
  set +a
  for var in $REQUIRED_VARS; do
    value="${!var:-}"
    if [ -z "$value" ]; then
      fail "required env var missing or empty: $var"
    else
      pass "required env var set: $var"
    fi
  done
fi

# 4. Compose config validates (only if docker + file + env are all present)
if command -v docker >/dev/null 2>&1 && [ -f "$COMPOSE_FILE" ] && [ -f "$ENV_FILE" ]; then
  if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config >/dev/null 2>/tmp/wp03-compose-config-err; then
    pass "docker compose config parses cleanly"
  else
    fail "docker compose config failed to parse: $(cat /tmp/wp03-compose-config-err 2>/dev/null)"
  fi
fi

# 5. Disk space check (Docker root, fall back to current volume)
docker_root="$ROOT_DIR"
if command -v docker >/dev/null 2>&1; then
  info_root="$(docker info --format '{{.DockerRootDir}}' 2>/dev/null)"
  [ -n "$info_root" ] && [ -d "$info_root" ] && docker_root="$info_root"
fi
if command -v df >/dev/null 2>&1; then
  free_mb="$(df -Pm "$docker_root" 2>/dev/null | awk 'NR==2 {print $4}')"
  if [ -n "${free_mb:-}" ]; then
    if [ "$free_mb" -lt "$MIN_FREE_DISK_MB" ]; then
      fail "only ${free_mb}MB free at $docker_root (threshold ${MIN_FREE_DISK_MB}MB)"
    else
      pass "disk space OK: ${free_mb}MB free at $docker_root"
    fi
  else
    warn "could not determine free disk space at $docker_root"
  fi
else
  warn "df not available, skipping disk space check"
fi

# 6. Dependency connectivity — only meaningful on a rolling redeploy where
#    mongo/redis containers are already up. On a cold start there is nothing
#    to connect to yet, so this is a skip, not a failure.
if command -v docker >/dev/null 2>&1; then
  if docker compose -f "$COMPOSE_FILE" ps --status running --services 2>/dev/null | grep -qx mongo; then
    if docker compose -f "$COMPOSE_FILE" exec -T mongo mongosh --quiet --eval 'db.adminCommand("ping")' >/dev/null 2>&1; then
      pass "mongo connectivity OK (already running)"
    else
      fail "mongo is running but did not respond to ping"
    fi
  else
    warn "mongo is not currently running — cold start, connectivity check skipped"
  fi

  if docker compose -f "$COMPOSE_FILE" ps --status running --services 2>/dev/null | grep -qx redis; then
    if docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli -a "${REDIS_PASSWORD:-}" ping >/dev/null 2>&1; then
      pass "redis connectivity OK (already running)"
    else
      fail "redis is running but did not respond to PING"
    fi
  else
    warn "redis is not currently running — cold start, connectivity check skipped"
  fi
fi

# 7. Migration status — deliberately not auto-checked against a fake signal.
# Apps/ai-backend/src/modules/migration is a job-based SQL migration pipeline
# for a separate concern from the app's own schemaless Mongo store. If a
# migration job is pending for this deploy, run/validate it explicitly via
# POST /migration/run and POST /migration/validate before continuing — this
# script has no way to know which jobId (if any) applies to a given deploy.
warn "migration status not auto-verified — confirm any required /migration/run + /migration/validate jobs manually before deploying"

echo
echo "== summary: $fail_count failure(s), $warn_count warning(s) =="
if [ "$fail_count" -gt 0 ]; then
  exit 1
fi
exit 0
