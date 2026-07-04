# WP-03 — Deployment Runbook

**Date:** 2026-07-03
**Scope:** `docker-compose.production.yml`, `Infrastructure/scripts/*.sh`

See `DeploymentArchitecture.md` for the topology/design rationale and
`RollbackProcedure.md` for rollback details. This document is the
step-by-step operator procedure.

---

## 1. Before you start

- You have a `.env` file at the repo root with every variable listed in
  `ProductionDeploymentGuide.md`'s environment table.
- You have `docker` and `docker compose` (v2+) on the deploy host.
- If this deploy includes a data migration, run and validate it first via
  the migration module (`POST /migration/run`, `POST /migration/validate`
  — see `Apps/ai-backend/src/modules/migration`). `pre-deploy-check.sh`
  deliberately does not auto-detect this; it's a warning reminder, not a gate.

## 2. Normal deploy

```bash
cd Infrastructure/scripts

# Local build (default) — builds ai-backend/frontend from source:
./deploy.sh --version v1.2.3

# Or, deploying an already-published release image (see ReleaseWorkflow.md):
IMAGE_REGISTRY=ghcr.io/<repo> IMAGE_TAG=v1.2.3 ./deploy.sh --pull --version v1.2.3
```

`deploy.sh` runs, in order, and stops at the first failure:

1. **`pre-deploy-check.sh`** — env vars, compose config, disk space,
   dependency connectivity (skipped gracefully on a cold start).
2. **`backup.sh`** — Mongo dump + config snapshot (skipped on a cold start).
3. **build or pull** — depending on `--pull`.
4. **`docker compose up -d`** — Compose enforces the Mongo → Redis →
   ai-backend → frontend → nginx startup order via `depends_on: condition:
   service_healthy` (see `DeploymentArchitecture.md` §2).
5. **wait-for-healthy** — polls `docker compose ps` for up to
   `HEALTHY_TIMEOUT_SECONDS` (default 180s).
6. **`post-deploy-verify.sh`** — polls `/health`, `/readiness`, `/metrics`,
   and the frontend root.

On success, a JSON line is appended to `Infrastructure/deployment/deployments.log`
with version, git SHA, operator, image tag, and duration.

**On any failure**, `deploy.sh` automatically calls `rollback.sh` (see
`RollbackProcedure.md`) and exits non-zero — it does not leave the stack in
a half-deployed state for you to discover later.

## 3. Manual verification (any time, not just right after a deploy)

```bash
cd Infrastructure/scripts
EDGE_URL=https://<domain> ./post-deploy-verify.sh
```

`post-deploy-verify.sh` checks `/health`, `/readiness`, `/metrics`, and `/`
through `nginx` by default (`EDGE_URL=https://localhost`, `-k` for the
self-signed dev cert) — this is deliberate: `ai-backend`/`frontend` only
`expose` their ports internally in `docker-compose.production.yml` (only
`nginx` is published to the host), and checking through the edge also
proves nginx's own proxy routing, not just that the upstream processes
happen to be alive.

## 4. Incident handling

When something looks wrong (alerts, user reports, or a failed deploy that
didn't auto-rollback cleanly):

1. **Check `/health` first** — if it fails, the process itself is down or
   unresponsive (crash loop, OOM). Check `docker compose logs ai-backend`.
2. **Check `/readiness`** — if `/health` is fine but `/readiness` returns
   503, the response body tells you which dependency (`database`, `redis`,
   `bullmq`) is the problem. Check that dependency's container directly:
   `docker compose logs mongo` / `docker compose logs redis`.
3. **Check `/metrics`** — dependency-up gauges and request/error counters
   for a faster signal than grepping logs.
4. **Check `docker compose ps`** — a container stuck in `restarting` or
   `unhealthy` points at a startup-order or config problem, not a runtime one.
5. If the incident started with a deploy: **roll back** (§ `RollbackProcedure.md`)
   before continuing to debug — restore service first, investigate the
   root cause against the rolled-back state or a copy of the failed logs.

## 5. Recovery

- **Data loss / corruption suspected:** restore from the most recent
  `Infrastructure/scripts/backups/<timestamp>/mongo/dump.archive` via
  `mongorestore --archive`. Always test a restore against a scratch Mongo
  instance before restoring into production.
- **Config drift** (someone hand-edited `.env`/`nginx.conf` on the host):
  restore from the same backup's `config/` folder via `rollback.sh --restore-config <dir>`.
- **Full host loss:** re-provision the host, restore `.env`/`nginx.conf`/`certs/`
  from the last known-good backup (kept off-host — see
  `RollbackProcedure.md` for why on-host backups alone aren't sufficient
  disaster recovery), then run `deploy.sh --pull --version <last known-good tag>`.

## 6. Testing this runbook

See `DeploymentVerificationChecklist.md` for the drills required before
trusting this runbook in production (cold start, restart, dependency
outages, rollback rehearsal) and the evidence from running them.
