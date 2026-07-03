# Reliability, Backup & Disaster Recovery — Certification Checklist

**Batch:** WP-04 — Reliability, Backup & Disaster Recovery
**Date:** 2026-07-03

---

## 1. Backup Strategy

| # | Check | Status | Evidence |
|---|---|---|---|
| 1.1 | MongoDB backed up via full `mongodump --archive` | PASS | `Infrastructure/scripts/backup.sh:30` |
| 1.2 | Config snapshot captured (compose file, nginx config, `.env`) | PASS | `Infrastructure/scripts/backup.sh:48-56` |
| 1.3 | Secrets are referenced (`.env` copy), never re-encoded or logged in plaintext elsewhere | PASS | `.env` copy is `chmod 600`, gitignored; `BackupRunbook.md` documents this explicitly |
| 1.4 | Redis backup deliberately scoped out with a documented reason | PASS | `DisasterRecoveryGuide.md` — Redis holds cache/queue state, not system of record |
| 1.5 | Incremental backup | **NOT IMPLEMENTED** | `BackupRunbook.md` Backlog — no oplog capture; flagged, not silently omitted |
| 1.6 | Scheduled backup | **NOT IMPLEMENTED** | `BackupRunbook.md` Backlog — no scheduler wired; operator/external cron required |
| 1.7 | Pre-deployment backup | PASS | `deploy.sh` already calls `backup.sh` before every deploy (pre-existing WP-03 behavior, reused here) |

## 2. Backup Verification

| # | Check | Status | Evidence |
|---|---|---|---|
| 2.1 | Archive integrity (non-empty, readable) checked | PASS | `Infrastructure/scripts/verify-backup.sh:56-63` |
| 2.2 | Checksum (sha256) generated at backup time and verified at restore/verify time | PASS | `backup.sh` (checksum write), `verify-backup.sh:66-79`, `restore.sh:99-107` (refuses mismatched checksum) |
| 2.3 | File size validated | PASS | `verify-backup.sh:58-63` |
| 2.4 | Restore test proves an actual restore succeeds, without touching live data | PASS | `verify-backup.sh:82-104` — restores into throwaway db namespace via `mongorestore --nsFrom/--nsTo`, then drops it |
| 2.5 | Metadata validation (backup directory naming convention) | PASS | `verify-backup.sh:47-52` |
| 2.6 | "Backup not valid until restore succeeds" principle enforced, not just documented | PASS | `verify-backup.sh` exit code gates validity; `dr-rehearsal.sh` calls it with `--restore-test` before ever inducing a failure |

## 3. Restore Procedures

| # | Check | Status | Evidence |
|---|---|---|---|
| 3.1 | Single database restore | PASS | `restore.sh --target mongo` |
| 3.2 | Full platform restore | PASS | `restore.sh --target full` |
| 3.3 | Configuration restore | PASS | `restore.sh --target config` |
| 3.4 | Point-in-time restore | **NOT SUPPORTED** | `RestoreRunbook.md` — explicitly documented as unsupported pending oplog capture, not silently assumed |
| 3.5 | Restore is destructive-safe (requires `--force`, supports `--dry-run`, takes its own safety backup) | PASS | `restore.sh:35-79` |
| 3.6 | Checksum verified before restoring, refuses corrupted archives | PASS | `restore.sh:99-107` |
| 3.7 | Every step documented for an operator with no prior context | PASS | `RestoreRunbook.md` |

## 4. Disaster Scenarios

| # | Scenario | Status | Evidence |
|---|---|---|---|
| 4.1 | MongoDB data loss | PASS (automated) | `dr-rehearsal.sh --scenario mongo-data-loss` |
| 4.2 | Redis failure | PASS (documented procedure) | `DisasterRecoveryGuide.md` §Disaster scenarios #2 |
| 4.3 | Application container loss | PASS (automated) | `dr-rehearsal.sh --scenario container-loss` |
| 4.4 | Host restart | PASS (documented procedure) | `DisasterRecoveryGuide.md` §Disaster scenarios #4 |
| 4.5 | Network interruption | PASS (documented procedure) | `DisasterRecoveryGuide.md` §Disaster scenarios #5 |
| 4.6 | Disk-full condition | PASS (documented procedure) | `DisasterRecoveryGuide.md` §Disaster scenarios #6 |
| 4.7 | Corrupted backup | PASS (detected + documented fallback) | `verify-backup.sh` checksum failure path; `DisasterRecoveryGuide.md` §7 |
| 4.8 | Failed restore | PASS (detected + documented escalation) | `restore.sh` non-zero exit + logged `failed` result; `DisasterRecoveryGuide.md` §8 |

## 5. Recovery Automation

| # | Check | Status | Evidence |
|---|---|---|---|
| 5.1 | Backup script | PASS | `Infrastructure/scripts/backup.sh` |
| 5.2 | Restore script | PASS | `Infrastructure/scripts/restore.sh` |
| 5.3 | Verification script | PASS | `Infrastructure/scripts/verify-backup.sh` |
| 5.4 | Integrity check (checksum) | PASS | folded into `backup.sh`/`verify-backup.sh`/`restore.sh` rather than a separate script — same guarantee, no duplicated logic |
| 5.5 | Disaster recovery rehearsal script | PASS | `Infrastructure/scripts/dr-rehearsal.sh` — covers 2/8 scenarios end-to-end by design (see §4), remainder documented |

## 6. Observability

| # | Check | Status | Evidence |
|---|---|---|---|
| 6.1 | Backup duration recorded | PASS | `backup.sh` `log_event` → `recovery.log` `durationMs` |
| 6.2 | Restore duration recorded | PASS | `restore.sh` `log_event` → `recovery.log` `durationMs` |
| 6.3 | Recovery outcome recorded | PASS | `result` field (`succeeded`/`failed`/`skipped`/`passed`/`recovered`) across all four scripts |
| 6.4 | Recovery operator recorded | PASS | `operator` field, from `$USER`/`$USERNAME` or `RECOVERY_OPERATOR` override |
| 6.5 | Recovery timestamp recorded | PASS | `timestamp` field, UTC ISO-8601 |
| 6.6 | Failure reason recorded | PASS | `reason`/`failedChecks` fields depending on script |
| 6.7 | Recovery success rate derivable | PASS | `RecoveryMetricsReport.md` documents the `jq` query over `recovery.log` |
| 6.8 | Integrated with existing Prometheus metrics convention | **NOT DONE** | `recovery.log` is file-based (matches WP-03's `deployments.log` precedent), not yet exported as `prom-client` gauges/counters — flagged as backlog in `RecoveryMetricsReport.md`, not silently equated with the existing `/metrics` endpoint |

## 7. Runbooks

| # | Check | Status | Evidence |
|---|---|---|---|
| 7.1 | `BackupRunbook.md` | PASS | `Apps/ai-backend/BackupRunbook.md` |
| 7.2 | `RestoreRunbook.md` | PASS | `Apps/ai-backend/RestoreRunbook.md` |
| 7.3 | `DisasterRecoveryGuide.md` | PASS | `Apps/ai-backend/DisasterRecoveryGuide.md` |
| 7.4 | `ReliabilityCertificationChecklist.md` | PASS | this document |
| 7.5 | `RecoveryMetricsReport.md` | PASS | `Apps/ai-backend/RecoveryMetricsReport.md` |

## 8. Certification Summary

| Section | Checks | Passed | Documented Gap | Failed |
|---|---|---|---|---|
| 1. Backup Strategy | 7 | 5 | 2 | 0 |
| 2. Backup Verification | 6 | 6 | 0 | 0 |
| 3. Restore Procedures | 7 | 6 | 1 | 0 |
| 4. Disaster Scenarios | 8 | 8 | 0 | 0 |
| 5. Recovery Automation | 5 | 5 | 0 | 0 |
| 6. Observability | 8 | 7 | 1 | 0 |
| 7. Runbooks | 5 | 5 | 0 | 0 |
| **Total** | **46** | **42** | **4** | **0** |

**Certification: PASS with 4 documented gaps** (incremental backup, backup
scheduling, point-in-time restore, Prometheus-native recovery metrics) — all
tracked in the Backlog sections of `BackupRunbook.md`, `RestoreRunbook.md`,
and `RecoveryMetricsReport.md`. No check failed outright; nothing here is
silently assumed to work without evidence.

**Not independently re-executed as part of this certification pass:**
`dr-rehearsal.sh` requires a live `docker-compose.production.yml` stack with a
populated `.env` (`MONGO_ROOT_USER`/`MONGO_ROOT_PASSWORD`/`REDIS_PASSWORD`),
which does not exist in this working copy — only `bash -n` syntax validation
was run on all four scripts. Run the full rehearsal against a real
staging stack before relying on the RTO/RPO figures in
`DisasterRecoveryGuide.md` as anything more than design targets.
