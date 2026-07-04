# WP-03 — Deployment Automation & Operational Readiness Report

**Date:** 2026-07-03
**Scope:** `docker-compose.production.yml`, `Infrastructure/scripts/*.sh`

---

## 1. What was built

| Artifact | Purpose |
|---|---|
| `Infrastructure/scripts/deploy.sh` | Orchestrator: pre-deploy-check → backup → build/pull → up → wait-for-healthy → post-deploy-verify, auto-rollback on any stage failure |
| `Infrastructure/scripts/pre-deploy-check.sh` | Env vars, compose config, disk space, dependency connectivity, migration reminder |
| `Infrastructure/scripts/backup.sh` | Authenticated Mongo dump + config snapshot (`docker-compose.production.yml`, `nginx.conf`, `.env`), retention-pruned |
| `Infrastructure/scripts/post-deploy-verify.sh` | Polls `/health`, `/readiness`, `/metrics`, frontend `/` through the real edge (nginx) |
| `Infrastructure/scripts/rollback.sh` | Reverts to a previous image tag and/or restores a config snapshot, then re-verifies |
| `docker-compose.production.yml` | `image:`/`IMAGE_TAG` added to `ai-backend`/`frontend` (registry-tag rollback support); `HOSTNAME: "0.0.0.0"` fix on `frontend` (see §3) |
| `DeploymentArchitecture.md` | Topology, startup dependency graph, image strategy, rolling/blue-green model, future-ready (K8s/Nomad/Cloud Run) mapping |
| `DeploymentRunbook.md` | Operator procedure: normal deploy, manual verification, incident handling, recovery |
| `DeploymentVerificationChecklist.md` | Pre/post-deploy checks and required drills, each with real evidence from a live run |
| `RollbackProcedure.md` | Automatic/manual rollback, last-known-good tag capture, rehearsal procedure |

## 2. Design decisions

- **Bash, not a new language/framework.** The deploy target is Docker Compose on a host with a shell — no new tooling dependency was introduced. Scripts are POSIX-ish and run identically from Git Bash (dev, this session) or a real Linux host (prod).
- **Automatic rollback captures the last known-good image tag itself.** `deploy.sh` inspects the currently-running `ai-backend` container's image tag before recreating anything, so an unattended failure rolls back to the exact previous version without an operator needing to supply it — see `RollbackProcedure.md` §5.
- **Post-deploy verification goes through nginx by default, not around it.** `ai-backend`/`frontend` are `expose`-only (never published to the host) — checking through the edge is both the only thing that actually works from outside the compose network and the more correct check, since it also proves nginx's routing.
- **`pre-deploy-check.sh` does not fabricate a migration-status check.** The existing `Apps/ai-backend/src/modules/migration` module is a job-based SQL pipeline for a separate concern; inventing a fake "no pending migrations" signal against it would be worse than an explicit reminder. This is a deliberate scope boundary, not an oversight.
- **Rollback that can't restore health fails loudly and stops** — it does not loop or retry. A rollback that doesn't restore health means the prior version has its own problem, or the outage isn't deploy-related; an automated retry loop would burn time better spent on manual investigation (verified live, see checklist §4.4).

## 3. Real bugs found and fixed by actually running the drills

Doing a live cold-start deploy, dependency-outage drills, and a rollback rehearsal (not just describing expected behavior) surfaced three real, pre-existing/newly-introduced issues, all fixed in this pass:

1. **Frontend Docker healthcheck could never pass** — Docker's default `HOSTNAME` env var (container ID) was being read by Next.js's standalone server as its bind address, so it listened on the container's own IP instead of `127.0.0.1`, which the in-container healthcheck curls. This was a **pre-existing bug**, invisible until something actually gated on `frontend`'s health status. Fixed by pinning `HOSTNAME: "0.0.0.0"` in `docker-compose.production.yml`.
2. **`post-deploy-verify.sh`'s first draft checked host ports that are never published** (`ai-backend`/`frontend` are `expose`-only) — every check failed with connection-refused regardless of actual health. Fixed by defaulting to checking through `nginx` (`EDGE_URL=https://localhost`).
3. **`rollback.sh --restore-config` and `backup.sh`'s snapshot layout disagreed** on where config files live (`<dir>/` vs `<dir>/config/`), causing a silent no-op restore with no error. Fixed by having `rollback.sh` detect and use the `config/` subdirectory, and fail loudly (instead of silently "succeeding") if no known config file is found.

Also fixed inline: `backup.sh`'s `mongodump` initially failed with `(Unauthorized)` — added `--username`/`--password`/`--authenticationDatabase admin` sourced from `.env`.

None of these would have been caught by writing the scripts and reasoning about them on paper — all three only showed up when the full stack actually ran.

## 4. What was and wasn't run live

**Run live, with evidence in `DeploymentVerificationChecklist.md`:**
- Cold start of the full 5-container stack via `deploy.sh` (build mode)
- Startup-order enforcement via Compose `depends_on: condition: service_healthy`
- Full-stack restart
- Redis outage + recovery, with `/readiness` correctly degrading and self-healing
- Mongo outage + recovery, same
- Liveness (`/health`) staying green throughout both dependency outages
- `post-deploy-verify.sh` through nginx (`/health`, `/readiness`, `/metrics`, `/`)
- `backup.sh` (both cold-start skip path and warm-stack authenticated Mongo dump + config snapshot)
- `rollback.sh --restore-config` rehearsal, including re-verification
- Two real automatic-rollback triggers (a transient registry timeout, and the frontend healthcheck bug above) — both correctly detected, both correctly attempted rollback, both correctly failed loudly since there was nothing to roll back to on a first deploy

**Not run live (documented as design, not silently assumed):**
- `rollback.sh --to-tag <version>` against a real registry — this repo has no GitHub remote yet (per `CI_CD_Report.md`), so there is no second published GHCR tag to pull. The underlying mechanism (`docker compose pull` against `IMAGE_REGISTRY`/`IMAGE_TAG`) is identical to the `--restore-config` path already verified, just pointed at a registry instead of a local build cache.
- Node/host failure — this is a single-host Compose deployment; "node failure" is equivalent to total outage today, not a distinct failure mode with its own recovery path yet (see `DeploymentArchitecture.md` §5 for the multi-host path this would require).

All test artifacts from the live drill (throwaway `.env`, self-signed certs, backup snapshots, `deployments.log`) were removed after verification — they are gitignored and were never intended to persist.

## 5. Known limitations (tracked, not blocking WP-03)

- Deploys are recreate-in-place, not zero-downtime (see `DeploymentArchitecture.md` §5 for the documented blue/green path once running >1 host).
- `PREV_TAG` capture for automatic rollback assumes `ai-backend` and `frontend` are always released at the same tag (true today, per `ReleaseWorkflow.md`) — see `RollbackProcedure.md` §6.
- No automated TLS cert renewal (pre-existing gap, documented in `ProductionDeploymentGuide.md`).

## 6. Deliverables

- `Infrastructure/scripts/{deploy,pre-deploy-check,backup,post-deploy-verify,rollback}.sh`
- `DeploymentArchitecture.md`
- `DeploymentRunbook.md`
- `DeploymentVerificationChecklist.md`
- `RollbackProcedure.md`
- `DeploymentAutomationReport.md` (this file)
- `docker-compose.production.yml` (image-tag support + frontend `HOSTNAME` fix)
- `Infrastructure/scripts/README.md`, `Infrastructure/deployment/README.md` (updated from empty placeholders)
- `.gitignore` (backups directory excluded)

## 7. Classification

**READY_FOR_RELIABILITY** — a deploy can be run repeatedly with the same outcome (`deploy.sh`), is validated automatically (`post-deploy-verify.sh`, health-gated startup order), and rolls back safely on failure (`rollback.sh`, exercised live including two real unplanned triggers during this pass). Full production readiness for a closed beta additionally needs: a GitHub remote (to make `--to-tag` registry rollback and `ReleaseWorkflow.md` operable end-to-end), real TLS certs, and a decision on off-host backup storage (local `backups/` alone is not disaster recovery if the host itself is lost).
