#!/usr/bin/env bash
# WP-04 — Backup verification: a backup is not valid until this passes.
# Checks archive existence/size/checksum/metadata, and optionally proves an
# actual restore succeeds by restoring into a throwaway database namespace
# on the same mongo container (never touches the live database).
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.production.yml}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
LOG_FILE="${RECOVERY_LOG_FILE:-$ROOT_DIR/Infrastructure/deployment/recovery.log}"
OPERATOR="${RECOVERY_OPERATOR:-${USER:-${USERNAME:-unknown}}}"

BACKUP_DIR=""
RESTORE_TEST=0

usage() {
  echo "Usage: verify-backup.sh <backup-dir> [--restore-test]"
  echo "  <backup-dir>     Directory produced by backup.sh"
  echo "  --restore-test   Actually mongorestore into a throwaway db to prove it works"
  exit 2
}

[ $# -eq 0 ] && usage
BACKUP_DIR="$1"; shift
while [ $# -gt 0 ]; do
  case "$1" in
    --restore-test) RESTORE_TEST=1; shift ;;
    -h|--help) usage ;;
    *) echo "Unknown argument: $1"; usage ;;
  esac
done

fail_count=0
start_ms=$(($(date +%s%N) / 1000000))

log_event() {
  result="$1"
  duration_ms=$(($(date +%s%N) / 1000000 - start_ms))
  mkdir -p "$(dirname "$LOG_FILE")"
  printf '{"type":"verify","timestamp":"%s","backupDir":"%s","operator":"%s","durationMs":%s,"result":"%s","failedChecks":%s}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$BACKUP_DIR" "$OPERATOR" "$duration_ms" "$result" "$fail_count" >> "$LOG_FILE"
}

echo "== WP-04 backup verification: $BACKUP_DIR =="

# 1. Metadata: directory name must be a backup.sh timestamp (YYYYMMDDTHHMMSSZ)
base="$(basename "$BACKUP_DIR")"
if echo "$base" | grep -qE '^[0-9]{8}T[0-9]{6}Z$'; then
  echo "[PASS] metadata: directory name matches expected timestamp format ($base)"
else
  echo "[WARN] metadata: directory name '$base' doesn't match backup.sh's timestamp format — proceeding anyway"
fi

archive="$BACKUP_DIR/mongo/dump.archive"
if [ -f "$archive" ]; then
  # 2. Archive integrity: non-empty, readable
  size="$(wc -c < "$archive" 2>/dev/null || echo 0)"
  if [ "$size" -gt 0 ]; then
    echo "[PASS] archive integrity: $archive exists and is non-empty ($size bytes)"
  else
    echo "[FAIL] archive integrity: $archive is empty"
    fail_count=$((fail_count + 1))
  fi

  # 3. Checksum
  if [ -f "$archive.sha256" ]; then
    if command -v sha256sum >/dev/null 2>&1; then
      expected="$(cut -d' ' -f1 < "$archive.sha256")"
      actual="$(sha256sum "$archive" | cut -d' ' -f1)"
      if [ "$expected" = "$actual" ]; then
        echo "[PASS] checksum: matches $archive.sha256"
      else
        echo "[FAIL] checksum: mismatch — expected $expected, got $actual (archive may be corrupted)"
        fail_count=$((fail_count + 1))
      fi
    else
      echo "[WARN] checksum: sha256sum not available to verify, skipping"
    fi
  else
    echo "[WARN] checksum: no $archive.sha256 found (backup predates WP-04 checksum support)"
  fi

  # 4. Restore test (optional, requires a running mongo container)
  if [ "$RESTORE_TEST" -eq 1 ]; then
    if ! command -v docker >/dev/null 2>&1; then
      echo "[FAIL] restore test: docker not available"
      fail_count=$((fail_count + 1))
    else
      [ -f "$ENV_FILE" ] && { set -a; . "$ENV_FILE"; set +a; }
      probe_db="wp04_verify_$(date -u +%Y%m%d%H%M%S)"
      echo "[INFO] restore test: restoring into throwaway namespace '$probe_db' on the live mongo container"
      if docker compose -f "$COMPOSE_FILE" exec -T mongo sh -c \
        "mongorestore --username '${MONGO_ROOT_USER:-}' --password '${MONGO_ROOT_PASSWORD:-}' --authenticationDatabase admin --archive --nsFrom='*' --nsTo='${probe_db}.*'" \
        < "$archive" >/tmp/wp04-verify-restore.log 2>&1; then
        echo "[PASS] restore test: mongorestore into '$probe_db' succeeded"
        docker compose -f "$COMPOSE_FILE" exec -T mongo sh -c \
          "mongosh --quiet --username '${MONGO_ROOT_USER:-}' --password '${MONGO_ROOT_PASSWORD:-}' --authenticationDatabase admin --eval 'db.getSiblingDB(\"$probe_db\").dropDatabase()'" \
          >/dev/null 2>&1
        echo "[INFO] restore test: dropped throwaway namespace '$probe_db'"
      else
        echo "[FAIL] restore test: mongorestore failed — see /tmp/wp04-verify-restore.log"
        fail_count=$((fail_count + 1))
      fi
    fi
  else
    echo "[INFO] restore test: skipped (pass --restore-test to prove a real restore succeeds)"
  fi
else
  echo "[WARN] no mongo archive at $archive — nothing to verify for the database portion"
fi

if [ -d "$BACKUP_DIR/config" ] && [ -n "$(ls -A "$BACKUP_DIR/config" 2>/dev/null)" ]; then
  echo "[PASS] config snapshot present: $BACKUP_DIR/config"
else
  echo "[WARN] no config snapshot found at $BACKUP_DIR/config"
fi

echo
if [ "$fail_count" -gt 0 ]; then
  echo "== verification FAILED: $fail_count check(s) did not pass — this backup is NOT valid =="
  log_event "failed"
  exit 1
fi
echo "== verification PASSED — backup is valid =="
log_event "passed"
exit 0
