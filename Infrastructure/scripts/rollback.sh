#!/usr/bin/env bash
# WP-03 — Rollback: revert to a previous GHCR image tag and/or restore a
# config snapshot taken by backup.sh, then re-verify. Called automatically
# by deploy.sh on a failed deploy, or run manually by an operator.
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.production.yml}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
LOG_FILE="${DEPLOY_LOG_FILE:-$ROOT_DIR/Infrastructure/deployment/deployments.log}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

TO_TAG=""
RESTORE_CONFIG_DIR=""
REASON="manual rollback"

usage() {
  echo "Usage: rollback.sh [--to-tag <version>] [--restore-config <backup-dir>] [--reason \"<text>\"]"
  echo "  With neither --to-tag nor --restore-config, just re-runs post-deploy-verify.sh"
  echo "  (this is the correct call for deploy.sh to make on a cold-start failure, where"
  echo "  there is no prior version or config snapshot to revert to)."
  exit 2
}

while [ $# -gt 0 ]; do
  case "$1" in
    --to-tag) TO_TAG="$2"; shift 2 ;;
    --restore-config) RESTORE_CONFIG_DIR="$2"; shift 2 ;;
    --reason) REASON="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown argument: $1"; usage ;;
  esac
done

log_event() {
  result="$1"
  mkdir -p "$(dirname "$LOG_FILE")"
  printf '{"type":"rollback","timestamp":"%s","toTag":"%s","restoreConfig":"%s","reason":"%s","result":"%s"}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$TO_TAG" "$RESTORE_CONFIG_DIR" "$REASON" "$result" >> "$LOG_FILE"
}

echo "== WP-03 rollback =="
echo "reason: $REASON"

if [ -z "$TO_TAG" ] && [ -z "$RESTORE_CONFIG_DIR" ]; then
  echo "[INFO] no --to-tag or --restore-config given — nothing to revert (likely a cold-start failure), verifying current state only"
fi

if [ -n "$RESTORE_CONFIG_DIR" ]; then
  if [ ! -d "$RESTORE_CONFIG_DIR" ]; then
    echo "[FAIL] restore dir not found: $RESTORE_CONFIG_DIR"
    log_event "failed"
    exit 1
  fi
  # backup.sh writes config snapshots under <backup-dir>/config/ — accept
  # either that layout or a bare directory of files, so a hand-assembled
  # restore dir also works.
  config_src="$RESTORE_CONFIG_DIR"
  [ -d "$RESTORE_CONFIG_DIR/config" ] && config_src="$RESTORE_CONFIG_DIR/config"

  restored_any=0
  for f in docker-compose.production.yml nginx.conf; do
    if [ -f "$config_src/$f" ]; then
      cp "$config_src/$f" "$ROOT_DIR/$f"
      echo "[PASS] restored $f from $config_src"
      restored_any=1
    fi
  done
  if [ -f "$config_src/.env" ]; then
    cp "$config_src/.env" "$ENV_FILE"
    echo "[PASS] restored .env from $config_src"
    restored_any=1
  fi
  if [ "$restored_any" -eq 0 ]; then
    echo "[FAIL] no known config files (docker-compose.production.yml, nginx.conf, .env) found under $config_src"
    log_event "failed"
    exit 1
  fi
fi

if [ -n "$TO_TAG" ]; then
  echo "[INFO] rolling back images to tag: $TO_TAG"
  export IMAGE_TAG="$TO_TAG"
  if ! docker compose -f "$COMPOSE_FILE" pull ai-backend frontend; then
    echo "[FAIL] failed to pull images for tag $TO_TAG"
    log_event "failed"
    exit 1
  fi
  if ! docker compose -f "$COMPOSE_FILE" up -d --no-deps ai-backend frontend; then
    echo "[FAIL] failed to recreate ai-backend/frontend at tag $TO_TAG"
    log_event "failed"
    exit 1
  fi
fi

echo "[INFO] re-running post-deploy verification"
if "$SCRIPT_DIR/post-deploy-verify.sh"; then
  echo "[PASS] rollback verified healthy"
  log_event "verified"
  exit 0
fi

echo "[FAIL] rollback completed but verification still fails — manual intervention required, do not retry automatically"
log_event "verification_failed"
exit 1
