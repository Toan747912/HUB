#!/usr/bin/env bash
# WP-04 — Restore: rebuild mongo data and/or config from a backup.sh snapshot.
# Destructive by design (mongorestore --drop). Requires --force unless --dry-run.
# Takes its own pre-restore safety snapshot first, so a bad restore is itself
# recoverable, unless --skip-safety-backup is passed (e.g. rehearsal scripts
# that already took one moments ago).
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.production.yml}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${RECOVERY_LOG_FILE:-$ROOT_DIR/Infrastructure/deployment/recovery.log}"
OPERATOR="${RECOVERY_OPERATOR:-${USER:-${USERNAME:-unknown}}}"

BACKUP_DIR=""
TARGET="full"      # full | mongo | config
DRY_RUN=0
FORCE=0
SKIP_SAFETY_BACKUP=0
REASON="manual restore"

usage() {
  echo "Usage: restore.sh --backup-dir <dir> [--target full|mongo|config] [--force] [--dry-run] [--skip-safety-backup] [--reason \"<text>\"]"
  echo "  --backup-dir   Directory produced by backup.sh (contains mongo/ and/or config/)"
  echo "  --target       What to restore. Default: full"
  echo "  --force        Required to actually run a mongo/config restore (destructive)"
  echo "  --dry-run      Validate inputs and print the plan, restore nothing"
  exit 2
}

while [ $# -gt 0 ]; do
  case "$1" in
    --backup-dir) BACKUP_DIR="$2"; shift 2 ;;
    --target) TARGET="$2"; shift 2 ;;
    --force) FORCE=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --skip-safety-backup) SKIP_SAFETY_BACKUP=1; shift ;;
    --reason) REASON="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown argument: $1"; usage ;;
  esac
done

[ -z "$BACKUP_DIR" ] && { echo "[FAIL] --backup-dir is required"; usage; }
[ -d "$BACKUP_DIR" ] || { echo "[FAIL] backup dir not found: $BACKUP_DIR"; exit 1; }

case "$TARGET" in full|mongo|config) ;; *) echo "[FAIL] --target must be full, mongo, or config"; exit 1 ;; esac

log_event() {
  result="$1"
  duration_ms="$2"
  mkdir -p "$(dirname "$LOG_FILE")"
  printf '{"type":"restore","timestamp":"%s","backupDir":"%s","target":"%s","operator":"%s","reason":"%s","durationMs":%s,"result":"%s"}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$BACKUP_DIR" "$TARGET" "$OPERATOR" "$REASON" "$duration_ms" "$result" >> "$LOG_FILE"
}

echo "== WP-04 restore =="
echo "backup dir: $BACKUP_DIR | target: $TARGET | operator: $OPERATOR"

start_ms=$(($(date +%s%N) / 1000000))

if [ "$DRY_RUN" -eq 1 ]; then
  echo "[INFO] --dry-run: no changes will be made"
  [ -f "$BACKUP_DIR/mongo/dump.archive" ] && echo "[PLAN] would restore mongo from $BACKUP_DIR/mongo/dump.archive"
  [ -d "$BACKUP_DIR/config" ] && echo "[PLAN] would restore config from $BACKUP_DIR/config"
  exit 0
fi

if [ "$FORCE" -ne 1 ]; then
  echo "[FAIL] restore is destructive (mongorestore --drop overwrites current data) — pass --force to proceed, or --dry-run to preview"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "[FAIL] docker not available"
  log_event "failed" 0
  exit 1
fi

if [ "$SKIP_SAFETY_BACKUP" -ne 1 ] && [ "$TARGET" != "config" ]; then
  echo "[INFO] taking a pre-restore safety backup of current state"
  if ! "$SCRIPT_DIR/backup.sh" >/tmp/wp04-safety-backup.log 2>&1; then
    echo "[FAIL] pre-restore safety backup failed — aborting restore, see /tmp/wp04-safety-backup.log"
    log_event "aborted_safety_backup_failed" 0
    exit 1
  fi
  echo "[PASS] safety backup complete: $(tail -n1 /tmp/wp04-safety-backup.log)"
fi

[ -f "$ENV_FILE" ] && { set -a; . "$ENV_FILE"; set +a; }

restore_failed=0

if [ "$TARGET" = "full" ] || [ "$TARGET" = "mongo" ]; then
  archive="$BACKUP_DIR/mongo/dump.archive"
  if [ ! -f "$archive" ]; then
    echo "[FAIL] no mongo archive at $archive"
    restore_failed=1
  else
    if [ -f "$archive.sha256" ] && command -v sha256sum >/dev/null 2>&1; then
      expected="$(cut -d' ' -f1 < "$archive.sha256")"
      actual="$(sha256sum "$archive" | cut -d' ' -f1)"
      if [ "$expected" != "$actual" ]; then
        echo "[FAIL] checksum mismatch for $archive — refusing to restore a corrupted archive"
        restore_failed=1
      fi
    fi
    if [ "$restore_failed" -eq 0 ]; then
      echo "[INFO] restoring mongo from $archive"
      if docker compose -f "$COMPOSE_FILE" exec -T mongo sh -c "mongorestore --username '${MONGO_ROOT_USER:-}' --password '${MONGO_ROOT_PASSWORD:-}' --authenticationDatabase admin --archive --drop" < "$archive" >/tmp/wp04-mongorestore.log 2>&1; then
        echo "[PASS] mongo restore complete"
      else
        echo "[FAIL] mongorestore failed — see /tmp/wp04-mongorestore.log"
        restore_failed=1
      fi
    fi
  fi
fi

if [ "$TARGET" = "full" ] || [ "$TARGET" = "config" ]; then
  config_src="$BACKUP_DIR/config"
  if [ ! -d "$config_src" ]; then
    echo "[FAIL] no config snapshot at $config_src"
    restore_failed=1
  else
    restored_any=0
    for f in docker-compose.production.yml nginx.conf; do
      if [ -f "$config_src/$f" ]; then
        cp "$config_src/$f" "$ROOT_DIR/$f"
        echo "[PASS] restored $f"
        restored_any=1
      fi
    done
    if [ -f "$config_src/.env" ]; then
      cp "$config_src/.env" "$ENV_FILE"
      echo "[PASS] restored .env"
      restored_any=1
    fi
    [ "$restored_any" -eq 0 ] && { echo "[FAIL] no known config files found under $config_src"; restore_failed=1; }
  fi
fi

end_ms=$(($(date +%s%N) / 1000000))
duration_ms=$((end_ms - start_ms))

if [ "$restore_failed" -eq 1 ]; then
  echo "== restore FAILED (${duration_ms}ms) =="
  log_event "failed" "$duration_ms"
  exit 1
fi

echo "== restore PASSED (${duration_ms}ms) =="
log_event "succeeded" "$duration_ms"
exit 0
