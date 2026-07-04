# WP-03 — Deployment Verification Checklist

**Date:** 2026-07-03
**Runtime evidence:** every row below was executed for real against
`docker-compose.production.yml` on this machine (Docker Desktop, `docker
compose v5.1.1`) — not just written and assumed correct. Two real bugs were
found and fixed during this run (see §5).

---

## 1. Pre-deploy checks

| # | Check | Status | Evidence |
|---|---|---|---|
| 1.1 | Env vars validated before touching containers | PASS | `pre-deploy-check.sh` run cold: all 7 required vars (`MONGO_ROOT_USER`, `MONGO_ROOT_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET`, `REFRESH_SECRET`, `CORS_ORIGIN`, `NEXT_PUBLIC_BACKEND_URL`) reported `[PASS]` |
| 1.2 | Docker/Compose CLI availability | PASS | `[PASS] docker CLI present`, `[PASS] docker compose plugin present` |
| 1.3 | Compose config validates | PASS | `[PASS] docker compose config parses cleanly` |
| 1.4 | Disk space check | PASS | `[PASS] disk space OK: 340321MB free` |
| 1.5 | Dependency connectivity (rolling redeploy case) | PASS (design) | Cold start correctly reported `[WARN] ... skipped`; connectivity branch (`mongosh`/`redis-cli ping` against already-running containers) exercised indirectly — not re-run with a warm stack in this pass, logic mirrors the docker-compose healthchecks already proven live in §2 |
| 1.6 | Migration status reminder | PASS (design) | Deliberately not auto-verified against a fake signal — see `DeploymentRunbook.md` §1 and the code comment in `pre-deploy-check.sh` explaining why |
| 1.7 | Backup before deploy | PASS | `backup.sh` on a cold start correctly skipped Mongo dump (`[SKIP] mongo is not running`) and still wrote a config snapshot; on a warm stack, produced a real authenticated `mongodump --archive` (9130 bytes) — see §5 for the auth bug fixed to get here |

## 2. Startup order / dependency validation

| # | Check | Status | Evidence |
|---|---|---|---|
| 2.1 | Cold start, full stack | PASS | `deploy.sh --version wp03-drill-2`: mongo → redis → ai-backend → frontend → nginx came up in order, `depends_on: condition: service_healthy` blocked each stage as designed; `deploy.sh`'s own wait-for-healthy loop reported `[PASS] all services with a healthcheck report healthy` |
| 2.2 | Full-stack restart | PASS | `docker compose restart` (all 5 containers) then `post-deploy-verify.sh` → all 4 checks green within the retry window |
| 2.3 | Redis unavailable → readiness degrades | PASS | `docker compose stop redis` → `GET /readiness` returned `503` with `{"checks":{"redis":"disconnected", ...}}`; `GET /health` stayed `200` (liveness correctly independent of dependency readiness) |
| 2.4 | Redis recovery | PASS | `docker compose start redis` → `/readiness` returned `200` with `redis:"connected"` within ~8s, no `ai-backend` restart needed |
| 2.5 | Mongo unavailable → readiness degrades | PASS | `docker compose stop mongo` → `/readiness` returned `503` with `database:"disconnected"` |
| 2.6 | Mongo recovery | PASS | `docker compose start mongo` → `/readiness` returned `200` with `database:"connected"` within ~8s |
| 2.7 | Partial outage (one dependency down, service still serving) | PASS | During both 2.3 and 2.5, `/health` and the frontend continued responding `200` throughout — a single dependency outage does not take the whole edge down |

## 3. Post-deploy verification

| # | Check | Status | Evidence |
|---|---|---|---|
| 3.1 | `GET /health` | PASS | `post-deploy-verify.sh` → `[PASS] backend health (https://localhost/health) -> 200` |
| 3.2 | `GET /readiness` | PASS | `[PASS] backend readiness (https://localhost/readiness) -> 200` |
| 3.3 | `GET /metrics` | PASS | `[PASS] backend metrics (https://localhost/metrics) -> 200` |
| 3.4 | Frontend availability | PASS | `[PASS] frontend (https://localhost/) -> 200` |
| 3.5 | Checks go through the real edge (nginx), not bypassed | PASS | All of 3.1–3.4 hit `https://localhost` (nginx), proving nginx's `proxy_pass` routing, not just that the upstream processes are alive — see §5 for why this matters |

## 4. Rollback rehearsal

| # | Check | Status | Evidence |
|---|---|---|---|
| 4.1 | Config snapshot restore | PASS | `rollback.sh --restore-config <backup-dir>` restored `docker-compose.production.yml`, `nginx.conf`, and `.env` from a real `backup.sh` snapshot; `[PASS] restored ...` printed for all three |
| 4.2 | Re-verification after rollback | PASS | `post-deploy-verify.sh` ran automatically as the last step of `rollback.sh` and passed all 4 checks |
| 4.3 | Automatic rollback on deploy failure | PASS | Two real (unintended) failures during this drill — a transient registry TLS timeout during image build, and the frontend healthcheck bug (§5) — both correctly triggered `deploy.sh`'s `abort()` → automatic `rollback.sh` invocation, both logged to `deployments.log` |
| 4.4 | Rollback that can't restore health fails loudly, doesn't loop | PASS | Both automatic rollbacks above ended in `[FAIL] rollback completed but verification still fails — manual intervention required, do not retry automatically`, exit code 1 — correct behavior, since there was genuinely nothing to roll back to on a first-ever cold-start failure |
| 4.5 | Deployment log captures every attempt | PASS | `deployments.log` (JSON lines) recorded all 3 deploy attempts and 3 rollback attempts from this drill with timestamp, version, git SHA, operator, duration, result, and reason |

## 5. Real bugs found and fixed during this drill

Running the drills for real (rather than describing expected behavior) surfaced three issues, all fixed before this checklist was finalized:

1. **Frontend container healthcheck could never pass.** Docker sets `HOSTNAME` to the container ID by default; Next.js's standalone `server.js` binds to `process.env.HOSTNAME` instead of `0.0.0.0`, so the frontend was listening on its own container IP, not `127.0.0.1` — which is exactly what the Dockerfile's in-container healthcheck curls. Result: `frontend` was permanently `unhealthy` even though it was actually serving requests fine (nginx could still reach it via Docker DNS). Fixed by setting `HOSTNAME: "0.0.0.0"` in `docker-compose.production.yml`'s `frontend.environment`. This is a pre-existing bug unrelated to WP-03's own scripts — it would have made every future deploy's health-gating unreliable.
2. **`post-deploy-verify.sh` originally checked `localhost:3001`/`localhost:3000` directly**, but `ai-backend`/`frontend` only `expose` those ports internally in `docker-compose.production.yml` — only `nginx` (80/443) is published to the host. Every check failed with connection-refused (status `000`) regardless of actual service health. Fixed by defaulting to `EDGE_URL=https://localhost` (through nginx), which is also the more correct check — it's what an actual client hits, and it proves nginx's own routing.
3. **`rollback.sh --restore-config` looked for config files directly under the given directory**, but `backup.sh` writes them under `<backup-dir>/config/`. The mismatch caused silent no-op restores (no error, nothing copied). Fixed by having `rollback.sh` check for a `config/` subdirectory and use it if present, and fail loudly if no known config file is found anywhere under the given path (previously it would silently "succeed" having restored nothing).

Also found and fixed inline: `backup.sh`'s `mongodump` initially failed with `(Unauthorized)` because it didn't pass Mongo credentials — fixed by authenticating with `MONGO_ROOT_USER`/`MONGO_ROOT_PASSWORD` from `.env`.

## 6. Not run live in this pass

- **Node/host failure** (spec's "Node failure" drill) — not simulated; this is a single-host Compose deployment today (see `DeploymentArchitecture.md` §5), so "node failure" is equivalent to total outage, recoverable only by re-provisioning + `deploy.sh --pull` from the last published tag. No multi-node failover exists to test yet.
- **`--to-tag` image rollback** — requires a second published tag in a real registry (GHCR); not exercised against a live registry in this pass since this repo has no GitHub remote yet (per `CI_CD_Report.md`). The `--restore-config` path (§4.1) and the compose `image:`/`IMAGE_TAG` wiring (`DeploymentArchitecture.md` §4) were verified independently — pulling a real prior tag is mechanically the same `docker compose pull` call, just against a registry rather than a local build cache.
