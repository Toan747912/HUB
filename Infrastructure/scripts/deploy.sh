#!/usr/bin/env bash
# WP-03 — Deploy orchestrator: pre-deploy-check -> backup -> build/pull ->
# up -> wait-for-healthy -> post-deploy-verify. Auto-rolls-back on any
# stage failure and logs every attempt to Infrastructure/deployment/deployments.log.
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.production.yml}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
LOG_FILE="${DEPLOY_LOG_FILE:-$ROOT_DIR/Infrastructure/deployment/deployments.log}"
HEALTHY_TIMEOUT_SECONDS="${HEALTHY_TIMEOUT_SECONDS:-180}"

MODE="build"   # build (default, local) | pull (registry tag)
VERSION="${IMAGE_TAG:-dev}"

usage() {
  echo "Usage: deploy.sh [--pull] [--version <tag>]"
  echo "  --pull            pull images (IMAGE_REGISTRY/IMAGE_TAG) instead of building locally"
  echo "  --version <tag>   version/tag recorded in the deployment log (default: \$IMAGE_TAG or 'dev')"
  exit 2
}

while [ $# -gt 0 ]; do
  case "$1" in
    --pull) MODE="pull"; shift ;;
    --version) VERSION="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown argument: $1"; usage ;;
  esac
done

OPERATOR="${DEPLOY_OPERATOR:-$(git -C "$ROOT_DIR" config user.name 2>/dev/null || echo unknown)}"
GIT_SHA="$(git -C "$ROOT_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)"
START_TS=$(date +%s)

log_event() {
  result="$1"
  reason="${2:-}"
  duration=$(( $(date +%s) - START_TS ))
  mkdir -p "$(dirname "$LOG_FILE")"
  printf '{"type":"deploy","timestamp":"%s","version":"%s","gitSha":"%s","imageTag":"%s","operator":"%s","durationSeconds":%s,"result":"%s","reason":"%s"}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$VERSION" "$GIT_SHA" "${IMAGE_TAG:-$VERSION}" "$OPERATOR" "$duration" "$result" "$reason" >> "$LOG_FILE"
}

PREV_TAG=""

abort() {
  reason="$1"
  echo "[FAIL] $reason"
  echo "[INFO] invoking automatic rollback"
  rollback_args=(--reason "deploy failed: $reason")
  if [ -n "$PREV_TAG" ] && [ "$PREV_TAG" != "${IMAGE_TAG:-$VERSION}" ]; then
    echo "[INFO] rolling back to last known-good image tag: $PREV_TAG"
    rollback_args+=(--to-tag "$PREV_TAG")
  else
    echo "[INFO] no prior running image tag captured (cold start, or unchanged) — nothing to revert, will verify current state"
  fi
  if "$SCRIPT_DIR/rollback.sh" "${rollback_args[@]}"; then
    log_event "rolled_back" "$reason"
  else
    log_event "rollback_failed" "$reason"
  fi
  exit 1
}

echo "== WP-03 deploy: version=$VERSION mode=$MODE operator=$OPERATOR sha=$GIT_SHA =="

echo "-- stage: pre-deploy-check --"
"$SCRIPT_DIR/pre-deploy-check.sh" || abort "pre-deploy-check failed"

echo "-- stage: backup --"
"$SCRIPT_DIR/backup.sh" || abort "backup failed"

# Capture the currently-running ai-backend image tag (if any) as the
# rollback target, before it gets recreated below. Cold start -> empty.
prev_container="$(docker compose -f "$COMPOSE_FILE" ps -q ai-backend 2>/dev/null)"
if [ -n "$prev_container" ]; then
  prev_image="$(docker inspect --format '{{.Config.Image}}' "$prev_container" 2>/dev/null)"
  PREV_TAG="${prev_image##*:}"
  echo "[INFO] last known-good image tag: $PREV_TAG"
fi

echo "-- stage: build/pull --"
if [ "$MODE" = "pull" ]; then
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull || abort "image pull failed"
else
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build || abort "image build failed"
fi

echo "-- stage: up --"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d || abort "docker compose up failed"

echo "-- stage: wait for healthy --"
deadline=$(( $(date +%s) + HEALTHY_TIMEOUT_SECONDS ))
while true; do
  unhealthy=$(docker compose -f "$COMPOSE_FILE" ps --format '{{.Service}} {{.Health}}' 2>/dev/null | awk '$2!="" && $2!="healthy" {print $1"="$2}')
  if [ -z "$unhealthy" ]; then
    echo "[PASS] all services with a healthcheck report healthy"
    break
  fi
  if [ "$(date +%s)" -ge "$deadline" ]; then
    abort "services did not become healthy within ${HEALTHY_TIMEOUT_SECONDS}s: $unhealthy"
  fi
  sleep 3
done

echo "-- stage: post-deploy-verify --"
"$SCRIPT_DIR/post-deploy-verify.sh" || abort "post-deploy verification failed"

log_event "success" ""
echo "== deploy succeeded: version=$VERSION sha=$GIT_SHA =="
exit 0
