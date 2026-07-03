# AI Backend — Backup Runbook
**Workstream:** WP-04 — Reliability, Backup & Disaster Recovery
**Audience:** operators running backups against `docker-compose.production.yml`

---

## What gets backed up

| Asset | Mechanism | Location |
|---|---|---|
| MongoDB (all databases) | `mongodump --archive` inside the `mongo` container | `Infrastructure/scripts/backups/<timestamp>/mongo/dump.archive` |
| Archive checksum | `sha256sum` of the dump archive | `.../mongo/dump.archive.sha256` |
| App config | file copy | `.../config/docker-compose.production.yml`, `.../config/nginx.conf` |
| Secrets **references** | `.env` file copy (never secret values elsewhere; the file itself is `chmod 600`, gitignored, and never committed) | `.../config/.env` |
| Application artifacts | container images are pulled/pinned by `IMAGE_TAG` in `.env` — not re-archived here, restorable by re-pulling that tag | n/a |

Redis is **not** durably backed up by default: the compose stack runs it as a
cache/queue broker (BullMQ + rate-limit counters), not a system of record — see
`Redis failure` in `DisasterRecoveryGuide.md` for why data loss there is
tolerated rather than restored. If Redis starts being used for anything that
must survive a restart, revisit this decision (`RDB`/`AOF` snapshotting to a
mounted volume would be the mechanism, currently unconfigured).

## Backup types

- **Full backup** — `backup.sh` with mongo running: mongo dump + config snapshot. This is the only type currently implemented; it is a full dump every time (no incremental).
- **Incremental backup** — not implemented. MongoDB oplog-based incremental capture is the natural extension (see Backlog below); until then every backup is full and RPO is governed purely by backup *frequency*, not incremental granularity.
- **Configuration snapshot** — `backup.sh` always takes one, independent of whether mongo is running (useful standalone before an infra change).
- **Pre-deployment backup** — `deploy.sh` calls `backup.sh` automatically before every deploy.
- **Scheduled backup** — not wired to a scheduler in this repo (no cron/systemd-timer/k8s CronJob present). Operators must invoke `backup.sh` on a schedule externally (see Backlog) until one is added.

## Running a backup

```bash
cd Infrastructure/scripts
./backup.sh
```

Reads `docker-compose.production.yml` and `.env` from the repo root by default
(override via `COMPOSE_FILE`/`ENV_FILE`). Skips gracefully (exit 0) if `docker`
isn't available or `mongo` isn't running (cold start) — a config-only snapshot
is still taken in the latter case. Retention keeps the most recent
`BACKUP_RETENTION` (default 5) timestamped directories; older ones are pruned.

Every run appends one JSON line to `Infrastructure/deployment/recovery.log`:
```json
{"type":"backup","timestamp":"...","dest":"...","operator":"...","durationMs":1234,"result":"succeeded","reason":""}
```
`result` is one of `succeeded`, `failed`, `skipped`. See `RecoveryMetricsReport.md`
for how this feeds recovery success-rate reporting.

## Verifying a backup

**A backup is not considered valid until this passes** — do not rely on
`backup.sh` exiting 0 alone; it only proves the dump command succeeded, not
that the archive is restorable.

```bash
cd Infrastructure/scripts
./verify-backup.sh backups/<timestamp>              # integrity + checksum + size + metadata
./verify-backup.sh backups/<timestamp> --restore-test # + proves a real mongorestore succeeds
```

`--restore-test` restores into a throwaway database namespace
(`wp04_verify_<ts>`) on the **same live mongo container** via
`mongorestore --nsFrom/--nsTo`, then drops that namespace — it never touches
the real databases, so it is safe to run against production. Run it after
every backup you intend to actually rely on for recovery, and periodically
against retained backups to catch silent bit-rot.

## Recovery targets (RPO/RTO)

See `DisasterRecoveryGuide.md` for the full definitions. Summary:

| Target | Value | Driver |
|---|---|---|
| RPO (MongoDB) | ≤ time since last successful, verified backup | No incremental/oplog capture yet — full dumps only |
| RTO (single-service restore) | ≤ 15 minutes | `restore.sh --target mongo` runtime + `post-deploy-verify.sh` |
| RTO (full platform restore) | ≤ 30 minutes | `restore.sh --target full` + container recreation + verification |

## Backlog (known gaps, not implemented)

- No scheduler wired to `backup.sh` (cron/systemd timer/CI schedule) — operators must schedule it externally.
- No incremental/oplog-based backup — every backup is a full dump.
- No off-host/off-site copy of `Infrastructure/scripts/backups/` — it lives on the same disk as the stack it protects, so a disk-full or host-loss event takes out backups too unless an operator copies the directory elsewhere. Treat this as the single highest-priority reliability gap.
- No point-in-time restore (would require oplog capture, see above).
