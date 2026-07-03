# AI Backend — Disaster Recovery Guide
**Workstream:** WP-04 — Reliability, Backup & Disaster Recovery
**Audience:** operators responding to an infrastructure failure on the production stack

---

## Recovery targets

| Target | Definition | Value | Basis |
|---|---|---|---|
| **RPO** (Recovery Point Objective) | Maximum acceptable data loss, measured as time between the failure and the last verified backup | ≤ time since last successful `backup.sh` + `verify-backup.sh` run | No oplog/incremental capture exists (`BackupRunbook.md`) — RPO is purely a function of how often backups run and are verified. If backups run once/day, RPO is up to 24h. Tighten by increasing backup frequency, not by assuming this document changes without the schedule also changing. |
| **RTO** (Recovery Time Objective) — single database | Time from detected failure to a healthy, verified single-service restore | ≤ 15 minutes | `restore.sh --target mongo` (dump restore of realistic dev/staging dataset sizes) + `post-deploy-verify.sh` |
| **RTO** — full platform | Time from detected failure to a healthy, verified full-stack restore | ≤ 30 minutes | `restore.sh --target full` + `docker compose up -d` + `post-deploy-verify.sh` |

Measure actual recovery against these on every real incident and every
rehearsal (`dr-rehearsal.sh` records `detectionMs`/`recoveryMs` per run — see
`RecoveryMetricsReport.md`). If measured recovery consistently exceeds a
target, the target is either wrong (revise it here, explicitly) or the
recovery path needs work — don't silently let the gap stand undocumented.

## Health validation (run after every recovery, no exceptions)

```bash
cd Infrastructure/scripts
./post-deploy-verify.sh
```

| Check | Endpoint | Proves |
|---|---|---|
| Liveness | `GET /health` | Process is up and NestJS bootstrapped — no dependency checks |
| Readiness | `GET /readiness` | MongoDB (`readyState===1`), Redis, and BullMQ are all reachable — 503 with a `checks` breakdown if any fail |
| Metrics | `GET /metrics` | Prometheus scrape endpoint itself is alive (does not validate specific metric values) |
| Frontend | `GET /` (via nginx) | Static asset serving + reverse proxy path both work |

None of these prove **application-level** correctness after a restore (e.g.
"the restored data is the right data," "queue jobs resume where they left
off"). For that, spot-check after recovery:
- `db.audit_events.find().sort({timestamp:-1}).limit(5)` — most recent audit rows are present and dated as expected for the backup used.
- BullMQ queue depth is sane (not stuck at a huge backlog from before the incident, not silently zero when it shouldn't be) — check via the queue dashboard/metrics, not just `/readiness` (which only checks BullMQ *connectivity*, not queue health).
- Application startup logs contain no schema/index errors on first boot against restored data.

## Disaster scenarios

| # | Scenario | Automated by `dr-rehearsal.sh`? | Procedure |
|---|---|---|---|
| 1 | MongoDB data loss | Yes — `--scenario mongo-data-loss` | Backup → verify → stop mongo, remove its volume → bring mongo back up empty → `restore.sh --target mongo --force` → health-validate. |
| 2 | Redis failure | No (documented here) | Redis holds cache + BullMQ + rate-limit state, not durable data (`BackupRunbook.md`). Restart the container: `docker compose -f docker-compose.production.yml up -d --force-recreate redis`. Expect: cache cold (self-heals on next reads), in-flight rate-limit counters reset (acceptable), **in-flight BullMQ jobs may be lost** if Redis had no AOF/RDB persistence configured (currently the case) — this is a known gap, see Backlog. Health-validate after. |
| 3 | Application container loss | Yes — `--scenario container-loss` | `docker compose kill ai-backend && rm -f ai-backend` → `docker compose up -d ai-backend` → health-validate. Stateless container, no data implications. |
| 4 | Host restart | No (manual) | `docker compose -f docker-compose.production.yml up -d` after reboot (or confirm `restart: unless-stopped`/equivalent is set so compose brings services back automatically — verify this is actually configured before relying on it). Health-validate all services came back, not just that containers show "running." |
| 5 | Network interruption (between ai-backend and mongo/redis) | No (manual) | Transient: NestJS/mongoose/ioredis reconnect logic should recover automatically — confirm via `/readiness` flipping back to 200 without manual action. If it doesn't self-heal within a few reconnect-backoff cycles, restart the affected service container. |
| 6 | Disk-full condition | No (manual) | Check with `df -h` on the host. Immediate mitigation: prune old backups (`backup.sh`'s retention only prunes automatically at backup time, not on-demand), prune unused Docker images/volumes (`docker system prune`, **do not** run `-a --volumes` without confirming which volumes are safe — `mongo-data`/`redis-data` must never be pruned this way). Root cause is almost always unbounded log/backup growth — check `Infrastructure/scripts/backups/` size and `*.log` files first. |
| 7 | Corrupted backup | Partially — `verify-backup.sh` detects it | If `verify-backup.sh` reports a checksum mismatch or a failed `--restore-test`, that backup is unusable. Do not attempt `restore.sh` against it. Fall back to the next-most-recent backup that passes verification; this is why retention keeps 5, not 1 — a single corrupted backup should never be a full-outage event. If **all** retained backups are corrupted, this is a critical incident: escalate immediately, there may be no verified recovery point at all. |
| 8 | Failed restore (restore itself doesn't complete/verify) | Partially — `restore.sh`/`dr-rehearsal.sh` report this as `failed`, don't retry blindly | Check `/tmp/wp04-mongorestore.log`. Common causes: credential mismatch after a config restore, disk full on the mongo container, archive/engine version incompatibility. Do not re-run `restore.sh` repeatedly against the same backup expecting a different result — diagnose the specific failure first. If the chosen backup is suspect, verify it (`verify-backup.sh --restore-test`) before retrying with a different one. |

## Chaos drills

Run `dr-rehearsal.sh` periodically (recommend: before any production deploy
that touches Mongo/Redis wiring, and on a standing cadence — no scheduler is
wired up for this yet, same gap as backup scheduling):

```bash
cd Infrastructure/scripts
./dr-rehearsal.sh --scenario mongo-data-loss --confirm
./dr-rehearsal.sh --scenario container-loss --confirm
```

Each rehearsal measures and logs:
- **Detection time** — ms between inducing the failure and `post-deploy-verify.sh` first confirming it's detectable (readiness fails as expected).
- **Recovery time** — ms spent actually executing the restore/recreate step.
- **Data loss** — none by construction for `container-loss` (stateless); for `mongo-data-loss`, exactly the gap between the backup used and the moment of induced failure (zero in the rehearsal itself, since the backup is taken immediately before).
- **Operator** — whoever/whatever ran the script (`$USER`/`$USERNAME`, or set `RECOVERY_OPERATOR` explicitly, e.g. in CI).
- **System health after recovery** — the `post-deploy-verify.sh` result gating the rehearsal's pass/fail.

Only `mongo-data-loss` and `container-loss` are scripted end-to-end.
Scenarios 4-6 above need host-level access (reboot, network namespace
manipulation, disk quota changes) that this repo's automation deliberately
does not assume — run those manually against a disposable staging host, not
against anything shared, and record the outcome by hand in
`RecoveryMetricsReport.md` using the same fields as the automated log.

## Backlog (known gaps, not implemented)

- Redis has no AOF/RDB persistence configured — a Redis failure during in-flight BullMQ jobs can lose them. Low priority today (Redis holds cache/queue/rate-limit state, not the system of record) but should be revisited if queue durability requirements increase.
- No scheduler for `backup.sh` or `dr-rehearsal.sh` — both require an operator (or external cron/CI) to trigger them.
- No off-host backup replication (see `BackupRunbook.md`) — a host-loss scenario (not just a container/data-within-host loss) currently has no recovery path at all, since backups live on the same host.
- Scenarios 4-6 (host restart, network interruption, disk-full) are documented procedures only, not automated rehearsals.
