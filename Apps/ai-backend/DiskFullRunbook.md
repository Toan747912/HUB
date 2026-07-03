# AI Backend — Disk Full Runbook
**Workstream:** WP-06 — Operations, Monitoring & Closed Beta Readiness
**Audience:** on-call engineers operating the production host
**Date:** 2026-07-03

Expands `DisasterRecoveryGuide.md` scenario 6 ("Disk-full condition") into a full operator procedure.

---

## Signal

- Deploy/backup scripts fail with `ENOSPC` or `No space left on device`.
- `mongo`/`redis` containers fail health checks or refuse writes.
- Host monitoring (external to this stack — no in-app disk metric exists, see Known gaps) reports low free space.

## Triage

```bash
df -h
du -sh Infrastructure/scripts/backups/* | sort -rh | head -20
docker system df
```

Root cause is almost always one of:

1. **Unbounded backup growth.** `backup.sh` prunes to the most recent `BACKUP_RETENTION` (default 5) directories automatically, but *only at backup time* — if backups stopped running (no scheduler is wired up, per `BackupRunbook.md`), old ones are never pruned. Check `Infrastructure/scripts/backups/` size first.
2. **Unbounded log growth.** stdout logs are not rotated by this stack (Docker's default json-file log driver has no size cap configured in `docker-compose.production.yml`) — `docker inspect ai-backend --format '{{.HostConfig.LogConfig}}'` to confirm.
3. **Docker image/build cache accumulation.** Old image layers from repeated local builds (`deploy.sh` without `--pull`).
4. **MongoDB/Redis data volume growth.** Legitimate data growth, not a leak — see Mitigation.

## Mitigation

| Cause | Action |
|---|---|
| Backup directory oversized | `ls -1dt Infrastructure/scripts/backups/*/ \| tail -n +6 \| xargs rm -rf` (keeps the 5 most recent, matching `BACKUP_RETENTION`'s intent) — **verify each remaining backup still passes `verify-backup.sh` before deleting anything**, per `BackupRunbook.md`'s warning that a single corrupted backup should never be the only one left. |
| Docker log growth | Configure `max-size`/`max-file` on the `json-file` log driver (not currently set — see Known gaps) as a durable fix; for immediate relief, `truncate -s 0 $(docker inspect --format='{{.LogPath}}' ai-backend)` (data loss of recent logs — only do this if genuinely out of space, and only on the specific container's log file). |
| Docker build/image cache | `docker system prune` — **do not** run `-a --volumes`; that flag combination can remove `mongo-data`/`redis-data` volumes if they're not currently attached to a running container, which is a data-loss event, not cleanup. Confirm with `docker volume ls` that only the intended dangling images/build cache are targeted. |
| Legitimate data growth (Mongo/Redis volumes) | Not an emergency-mitigation case — plan a host disk resize or, for Mongo, an index/data-retention review. Do not delete database volume contents to free space. |

## Recovery validation

```bash
df -h
cd Infrastructure/scripts
./post-deploy-verify.sh
```
Confirm free space is back above a safe margin (recommend keeping headroom for at least one more full backup cycle — `BackupRunbook.md`'s dump size — plus normal data growth) and all services report healthy.

## Known gaps

- No disk-usage alert exists in `ai-backend-alerts.yml` or anywhere in this stack — disk pressure is currently only discovered when something else fails (a backup, a write, a deploy). This is a real monitoring gap for a scenario `DisasterRecoveryGuide.md` already calls out as unaddressed; recommend a host-level disk-usage alert (outside this repo's Prometheus rule file, since there's no node-exporter/cAdvisor wired up — see `MonitoringCertification.md`).
- No Docker log rotation configured (`docker-compose.production.yml` sets no `logging.driver`/`options` on any service).
- No off-host backup replication (per `BackupRunbook.md`) — pruning backups to reclaim disk space is the *only* lever available today; there is no "move old backups elsewhere first" option without operator-built tooling.
