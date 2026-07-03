# AI Backend — Restore Runbook
**Workstream:** WP-04 — Reliability, Backup & Disaster Recovery
**Audience:** operators restoring `docker-compose.production.yml` from a `backup.sh` snapshot

---

## Before you restore

1. **Confirm you need to.** `restore.sh` is destructive (`mongorestore --drop`)
   — it overwrites current collections with the backup's contents. If the
   current database is healthy, don't restore.
2. **Pick the backup.** List candidates: `ls -1dt Infrastructure/scripts/backups/*/`.
   Prefer the most recent one that passes verification.
3. **Verify it first**, always:
   ```bash
   cd Infrastructure/scripts
   ./verify-backup.sh backups/<timestamp> --restore-test
   ```
   Do not restore from a backup that fails verification — see
   `DisasterRecoveryGuide.md` → "Corrupted backup" for what to do instead.

## Restore procedures

All commands run from `Infrastructure/scripts/`.

### Single database restore (MongoDB only)
```bash
./restore.sh --backup-dir backups/<timestamp> --target mongo --force
```
Takes its own pre-restore safety backup of current state first (skip with
`--skip-safety-backup` only if you already have one you trust, e.g. inside
`dr-rehearsal.sh`). Verifies the archive checksum before restoring; refuses
to proceed if it doesn't match.

### Full platform restore (MongoDB + config)
```bash
./restore.sh --backup-dir backups/<timestamp> --target full --force
```
Restores `docker-compose.production.yml`, `nginx.conf`, and `.env` in addition
to the database. After this, re-apply the config:
```bash
docker compose -f docker-compose.production.yml up -d
```

### Configuration-only restore
```bash
./restore.sh --backup-dir backups/<timestamp> --target config --force
```
Use when config drifted or was corrupted but the database is intact — no
mongo restore is attempted, no safety backup is taken (nothing destructive to
protect against on the DB side).

### Point-in-time restore
**Not supported.** Backups are full `mongodump` snapshots taken at a single
point in time (see `BackupRunbook.md` — no oplog/incremental capture exists).
The only "point in time" available is the moment the chosen backup was taken.
If you need finer granularity than your backup schedule provides, that is a
gap to close by increasing backup frequency or adding oplog capture, not
something `restore.sh` can paper over today.

### Dry run
```bash
./restore.sh --backup-dir backups/<timestamp> --target full --dry-run
```
Prints what would be restored without touching anything or requiring `--force`.

## After restoring

Always validate health before declaring recovery complete:
```bash
cd Infrastructure/scripts
./post-deploy-verify.sh
```
This polls `/health`, `/readiness`, `/metrics`, and the frontend through
nginx. See `DisasterRecoveryGuide.md` → "Health validation" for what each
check actually proves and what to do if one fails after a restore.

## Failure modes during restore itself

| Symptom | Cause | Action |
|---|---|---|
| `restore.sh` exits with "checksum mismatch" | Archive corrupted in storage | Do not force past this. Use an older backup; see `DisasterRecoveryGuide.md` → "Corrupted backup". |
| `mongorestore failed` | Auth failure, disk full on the mongo container, incompatible archive version | Check `/tmp/wp04-mongorestore.log`. Confirm `MONGO_ROOT_USER`/`MONGO_ROOT_PASSWORD` in `.env` match the container's actual credentials (a config restore that predates a credential rotation will not match). |
| Restore "succeeds" but `post-deploy-verify.sh` still fails readiness | Data restored but app-level assumptions broken (e.g. missing indexes rebuilt by app startup, outbox/queue backlog inconsistent with restored state) | See `DisasterRecoveryGuide.md` → "Failed restore" for escalation steps. Do not repeatedly retry `restore.sh` against the same backup expecting a different result. |
| Pre-restore safety backup itself fails | Underlying issue (disk full, mongo already unreachable) that also affects the restore you're about to attempt | `restore.sh` aborts automatically in this case (logged as `aborted_safety_backup_failed`) rather than proceeding blind. Diagnose the underlying issue first. |

Every restore attempt is appended to `Infrastructure/deployment/recovery.log`
regardless of outcome — see `RecoveryMetricsReport.md`.
