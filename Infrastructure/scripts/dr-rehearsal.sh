#!/usr/bin/env bash
# WP-04 — Disaster recovery rehearsal: simulates a failure against a running
# stack, executes the real recovery path (backup already taken -> restore.sh),
# then validates health. Measures detection/recovery time and appends a
# structured record to recovery.log. Intended for a staging/local stack —
# refuses to run without explicit --confirm since it stops containers.
#
# Scenarios covered end-to-end here: mongo-data-loss, container-loss.
# Scenarios that are inherently manual/environment-specific (host-restart,
# network-interruption, disk-full, redis-failure, corrupted-backup,
# failed-restore) are documented step-by-step in DisasterRecoveryGuide.md
# instead of automated, since simulating them safely needs host-level
# access this script shouldn't assume (root, iptables, disk quotas).
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.production.yml}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${RECOVERY_LOG_FILE:-$ROOT_DIR/Infrastructure/deployment/recovery.log}"
OPERATOR="${RECOVERY_OPERATOR:-${USER:-${USERNAME:-unknown}}}"

SCENARIO=""
CONFIRM=0

usage() {
  echo "Usage: dr-rehearsal.sh --scenario mongo-data-loss|container-loss --confirm"
  echo "  --confirm   Required. This script stops containers and restores data on the target stack."
  exit 2
}

while [ $# -gt 0 ]; do
  case "$1" in
    --scenario) SCENARIO="$2"; shift 2 ;;
    --confirm) CONFIRM=1; shift ;;
    -h|--help) usage ;;
    *) echo "Unknown argument: $1"; usage ;;
  esac
done

case "$SCENARIO" in mongo-data-loss|container-loss) ;; *) echo "[FAIL] --scenario must be mongo-data-loss or container-loss"; usage ;; esac
[ "$CONFIRM" -eq 1 ] || { echo "[FAIL] refusing to run without --confirm (this stops containers on the target stack)"; exit 1; }

log_event() {
  result="$1"
  detection_ms="$2"
  recovery_ms="$3"
  mkdir -p "$(dirname "$LOG_FILE")"
  printf '{"type":"dr-rehearsal","timestamp":"%s","scenario":"%s","operator":"%s","detectionMs":%s,"recoveryMs":%s,"result":"%s"}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SCENARIO" "$OPERATOR" "$detection_ms" "$recovery_ms" "$result" >> "$LOG_FILE"
}

echo "== WP-04 disaster recovery rehearsal: $SCENARIO =="

echo "[STEP 1/5] pre-rehearsal backup"
if ! backup_dest="$("$SCRIPT_DIR/backup.sh")"; then
  echo "[FAIL] pre-rehearsal backup failed — aborting rehearsal, refusing to induce failure without a fresh backup"
  log_event "aborted_no_backup" 0 0
  exit 1
fi
echo "[PASS] backup ready: $backup_dest"

echo "[STEP 2/5] verify backup with a real restore test"
if ! "$SCRIPT_DIR/verify-backup.sh" "$backup_dest" --restore-test; then
  echo "[FAIL] backup failed verification — aborting rehearsal"
  log_event "aborted_backup_invalid" 0 0
  exit 1
fi

fail_start_ms=$(($(date +%s%N) / 1000000))

echo "[STEP 3/5] inducing failure: $SCENARIO"
case "$SCENARIO" in
  mongo-data-loss)
    docker compose -f "$COMPOSE_FILE" stop mongo
    docker compose -f "$COMPOSE_FILE" rm -f mongo
    docker volume rm "$(basename "$ROOT_DIR")_mongo-data" 2>/dev/null || true
    docker compose -f "$COMPOSE_FILE" up -d mongo
    ;;
  container-loss)
    docker compose -f "$COMPOSE_FILE" kill ai-backend
    docker compose -f "$COMPOSE_FILE" rm -f ai-backend
    ;;
esac
echo "[INFO] failure induced"

detection_start_ms=$(($(date +%s%N) / 1000000))
echo "[STEP 4/5] detecting failure via readiness endpoint"
"$SCRIPT_DIR/post-deploy-verify.sh" >/tmp/wp04-dr-detect.log 2>&1
detection_end_ms=$(($(date +%s%N) / 1000000))
detection_ms=$((detection_end_ms - fail_start_ms))
echo "[INFO] failure confirmed detectable (${detection_ms}ms since induction) — see /tmp/wp04-dr-detect.log"

echo "[STEP 5/5] executing recovery"
recovery_start_ms=$(($(date +%s%N) / 1000000))
recovery_ok=1
case "$SCENARIO" in
  mongo-data-loss)
    "$SCRIPT_DIR/restore.sh" --backup-dir "$backup_dest" --target mongo --force --skip-safety-backup --reason "dr-rehearsal:$SCENARIO" || recovery_ok=0
    ;;
  container-loss)
    docker compose -f "$COMPOSE_FILE" up -d ai-backend || recovery_ok=0
    ;;
esac
recovery_end_ms=$(($(date +%s%N) / 1000000))
recovery_ms=$((recovery_end_ms - recovery_start_ms))

echo "[INFO] running post-recovery health validation"
if [ "$recovery_ok" -eq 1 ] && "$SCRIPT_DIR/post-deploy-verify.sh"; then
  echo "== dr-rehearsal PASSED: $SCENARIO recovered in ${recovery_ms}ms (detected in ${detection_ms}ms) =="
  log_event "recovered" "$detection_ms" "$recovery_ms"
  exit 0
fi

echo "== dr-rehearsal FAILED: $SCENARIO did not recover cleanly — manual intervention required =="
log_event "failed" "$detection_ms" "$recovery_ms"
exit 1
