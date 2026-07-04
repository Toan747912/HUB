#!/usr/bin/env bash
# WP-03 — Pre-deploy backup: Mongo dump + config snapshot.
# Skips gracefully on a cold start (nothing running yet to back up).
# WP-04 extended this with a checksum file and recovery.log observability.
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.production.yml}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
BACKUP_ROOT="${BACKUP_ROOT:-$ROOT_DIR/Infrastructure/scripts/backups}"
RETENTION="${BACKUP_RETENTION:-5}"
LOG_FILE="${RECOVERY_LOG_FILE:-$ROOT_DIR/Infrastructure/deployment/recovery.log}"
OPERATOR="${RECOVERY_OPERATOR:-${USER:-${USERNAME:-unknown}}}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
dest="$BACKUP_ROOT/$timestamp"
start_ms=$(($(date +%s%N) / 1000000))

log_event() {
  result="$1"
  reason="${2:-}"
  duration_ms=$(($(date +%s%N) / 1000000 - start_ms))
  mkdir -p "$(dirname "$LOG_FILE")"
  printf '{"type":"backup","timestamp":"%s","dest":"%s","operator":"%s","durationMs":%s,"result":"%s","reason":"%s"}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$dest" "$OPERATOR" "$duration_ms" "$result" "$reason" >> "$LOG_FILE"
}

echo "== WP-03 backup =="

if ! command -v docker >/dev/null 2>&1; then
  echo "[SKIP] docker not available, nothing to back up"
  log_event "skipped" "docker not available"
  exit 0
fi

mongo_running="$(docker compose -f "$COMPOSE_FILE" ps --status running --services 2>/dev/null | grep -qx mongo && echo yes || echo no)"

if [ "$mongo_running" = "no" ]; then
  echo "[SKIP] mongo is not running — cold start, no data to back up"
else
  mkdir -p "$dest/mongo"
  echo "[INFO] dumping mongo into $dest/mongo"
  [ -f "$ENV_FILE" ] && { set -a; . "$ENV_FILE"; set +a; }
  if docker compose -f "$COMPOSE_FILE" exec -T mongo sh -c "mongodump --username '${MONGO_ROOT_USER:-}' --password '${MONGO_ROOT_PASSWORD:-}' --authenticationDatabase admin --archive" > "$dest/mongo/dump.archive" 2>"$dest/mongo/mongodump.log"; then
    size="$(wc -c < "$dest/mongo/dump.archive" 2>/dev/null || echo 0)"
    if [ "$size" -gt 0 ]; then
      echo "[PASS] mongo dump written: $dest/mongo/dump.archive ($size bytes)"
      if command -v sha256sum >/dev/null 2>&1; then
        (cd "$dest/mongo" && sha256sum dump.archive > dump.archive.sha256)
        echo "[PASS] checksum written: $dest/mongo/dump.archive.sha256"
      fi
    else
      echo "[FAIL] mongo dump produced an empty archive — see $dest/mongo/mongodump.log"
      log_event "failed" "empty archive"
      exit 1
    fi
  else
    echo "[FAIL] mongodump failed — see $dest/mongo/mongodump.log"
    log_event "failed" "mongodump command failed"
    exit 1
  fi
fi

mkdir -p "$dest/config"
for f in docker-compose.production.yml nginx.conf; do
  [ -f "$ROOT_DIR/$f" ] && cp "$ROOT_DIR/$f" "$dest/config/$f"
done
if [ -f "$ENV_FILE" ]; then
  cp "$ENV_FILE" "$dest/config/.env"
  chmod 600 "$dest/config/.env"
fi
echo "[PASS] config snapshot written: $dest/config"

# Retention: keep only the most recent $RETENTION backups.
mkdir -p "$BACKUP_ROOT"
count=$(ls -1d "$BACKUP_ROOT"/*/ 2>/dev/null | wc -l)
if [ "$count" -gt "$RETENTION" ]; then
  to_remove=$((count - RETENTION))
  ls -1dt "$BACKUP_ROOT"/*/ 2>/dev/null | tail -n "$to_remove" | while read -r old; do
    echo "[INFO] pruning old backup: $old"
    rm -rf "$old"
  done
fi

log_event "succeeded"
echo "$dest"
exit 0
