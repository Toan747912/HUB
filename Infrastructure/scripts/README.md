# Infrastructure / scripts

Deployment automation for `docker-compose.production.yml` (WP-03), extended
with reliability/backup/disaster-recovery automation (WP-04). See
`DeploymentRunbook.md` at the repo root, and `Apps/ai-backend/BackupRunbook.md`,
`RestoreRunbook.md`, `DisasterRecoveryGuide.md` for full operator walkthroughs.

| Script | Purpose |
|---|---|
| `deploy.sh` | Orchestrator — pre-deploy-check → backup → build/pull → up → wait-for-healthy → post-deploy-verify. Auto-rolls-back on any stage failure. |
| `pre-deploy-check.sh` | Validates env vars, compose config, disk space, dependency connectivity before touching containers. |
| `backup.sh` | Mongo dump (+ sha256 checksum) + config snapshot (`docker-compose.production.yml`, `nginx.conf`, `.env`) before a deploy. |
| `post-deploy-verify.sh` | Polls `/health`, `/readiness`, `/metrics`, and the frontend after `up`. Reusable standalone against any live stack, and as the post-recovery health gate. |
| `rollback.sh` | Reverts to a previous image tag and/or restores a `backup.sh` config snapshot, then re-verifies. |
| `restore.sh` | Restores mongo and/or config from a `backup.sh` snapshot. Destructive — requires `--force`; takes its own pre-restore safety backup unless `--skip-safety-backup`. Supports `--dry-run`. |
| `verify-backup.sh` | Validates a backup: archive integrity, checksum, size, metadata; `--restore-test` proves an actual restore succeeds into a throwaway db namespace. A backup isn't valid until this passes. |
| `dr-rehearsal.sh` | End-to-end rehearsal for `mongo-data-loss`/`container-loss`: backup → verify → induce failure → detect → restore → health-validate. Requires `--confirm`. Other disaster scenarios are documented (not automated) in `DisasterRecoveryGuide.md`. |

Run `./deploy.sh --help` (or any script's `--help`) for flags. All scripts read
`docker-compose.production.yml` and `.env` from the repo root by default
(override via `COMPOSE_FILE`/`ENV_FILE`).

Backups are written to `backups/<timestamp>/` (gitignored — they contain a
copy of `.env`). Every deploy/rollback/backup/restore/verify/rehearsal attempt
is appended as a JSON line to `../deployment/deployments.log` or
`../deployment/recovery.log` (both gitignored via the repo's `*.log` rule) —
see `Apps/ai-backend/RecoveryMetricsReport.md` for how to read `recovery.log`.
