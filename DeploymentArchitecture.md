# WP-03 — Deployment Architecture

**Date:** 2026-07-03
**Scope:** `docker-compose.production.yml` (Mongo, Redis, `ai-backend`, `frontend`, `nginx`)

---

## 1. Topology

```
Internet ──▶ nginx (80/443, TLS termination)
               ├─▶ /api, /health, /readiness, /metrics ──▶ ai-backend:3001
               └─▶ everything else                       ──▶ frontend:3000

ai-backend ──▶ mongo:27017 (internal only, not published to host)
ai-backend ──▶ redis:6379  (internal only, not published to host)
```

`mongo` and `redis` are reachable only from other containers on the compose
network. `nginx` is the only container exposed on the host (ports 80/443).
BullMQ workers run in-process inside `ai-backend` (see
[queue.service.ts](Apps/ai-backend/src/infrastructure/jobs/queue.service.ts))
— there is no separate worker container today, so "BullMQ Workers" in the
startup order below is a readiness gate inside `ai-backend`, not an
independent service.

## 2. Startup order and dependency validation

The spec's order (Mongo → Redis → BullMQ Workers → Backend → Frontend →
Reverse Proxy) is enforced by Compose's `depends_on: condition:
service_healthy`, not by a script guessing at timing:

```
mongo (healthcheck: mongosh ping)
  │
  ▼
redis (healthcheck: redis-cli ping)
  │
  ▼
ai-backend (depends_on mongo+redis healthy; healthcheck: GET /health;
            readiness gate for Mongo/Redis/BullMQ is GET /readiness,
            checked explicitly by post-deploy-verify.sh, not by Docker's
            own healthcheck, which only proves the process is up)
  │
  ▼
frontend (depends_on ai-backend healthy; healthcheck: GET /)
  │
  ▼
nginx (depends_on ai-backend + frontend; no healthcheck of its own —
       it is the entrypoint, so its own reachability is what
       post-deploy-verify.sh proves end-to-end through the proxy)
```

Every dependency must report `healthy` (not just "started") before the next
service is created — Compose blocks on this natively, and
`Infrastructure/scripts/deploy.sh` additionally polls `docker compose ps`
for a bounded timeout after `up -d` as a second check, so a container stuck
in `starting` fails the deploy instead of silently looking "up."

## 3. Environment/config validation

`docker-compose.production.yml` uses `${VAR:?VAR is required}` for every
secret (`MONGO_ROOT_USER`, `MONGO_ROOT_PASSWORD`, `REDIS_PASSWORD`,
`JWT_SECRET`, `REFRESH_SECRET`, `CORS_ORIGIN`, `NEXT_PUBLIC_BACKEND_URL`) —
Compose refuses to start if any is missing. `Infrastructure/scripts/pre-deploy-check.sh`
checks the same list *before* Compose is invoked, so a missing secret fails
fast with a clear message instead of a mid-deploy Compose error.

## 4. Image strategy

`ai-backend` and `frontend` now declare both `build:` (for local/dev
deploys) and `image: ${IMAGE_REGISTRY:-local}/<app>:${IMAGE_TAG:-latest}`.
This lines up with `ReleaseWorkflow.md`, which publishes immutable
`ghcr.io/<repo>/<app>:vX.Y.Z` images on every tag:

- **Local/dev deploy:** leave `IMAGE_REGISTRY`/`IMAGE_TAG` unset, run
  `deploy.sh` (default mode) — Compose builds from source and tags the
  image `local/<app>:latest`.
- **Registry-based deploy/rollback:** set `IMAGE_REGISTRY=ghcr.io/<repo>` and
  `IMAGE_TAG=v1.2.3`, run `deploy.sh --pull` — Compose pulls the exact
  released image instead of building. `rollback.sh --to-tag v1.2.2` uses the
  same mechanism to go backward.

## 5. Rolling deployment model

**Today (single host):** `deploy.sh` does a recreate-in-place rollout —
`docker compose up -d` recreates only the services whose image/config
changed, gated by the healthcheck chain above. This is not zero-downtime:
`ai-backend`/`frontend` containers restart, and `nginx` will 502 for
requests in flight during the brief container-swap window. Acceptable for a
single-host closed-beta deployment; documented as a known limitation, not
silently ignored.

**Future-ready (multi-host / traffic switch):** true blue/green needs a
load balancer in front of two independent `ai-backend`+`frontend` stacks
(e.g. two Compose projects, `blue` and `green`, on the same host or on
separate hosts behind `nginx` upstream weights). The procedure once that
exists:

1. Deploy the new version into the idle stack (`green`).
2. Run `post-deploy-verify.sh` against `green` directly (bypass `nginx`).
3. Shift `nginx` upstream weight from `blue` to `green` (reload, not
   restart, so no dropped connections).
4. Hold `blue` running for a grace period (rollback target with zero
   rebuild time — just shift weight back).
5. Decommission `blue` once `green` has been stable past the grace period.

The health/readiness contract (`/health`, `/readiness`, `/metrics`) already
in place is what makes this portable — it's the same contract a
Kubernetes `livenessProbe`/`readinessProbe`, a Nomad `check`, or a Cloud Run
startup/liveness probe would call. Moving off Compose later means replacing
the orchestrator, not rebuilding the health contract:

| Concept (this doc) | Docker Compose (today) | Kubernetes (future) | Nomad (future) | Cloud Run (future) |
|---|---|---|---|---|
| Startup gate | `depends_on: condition: service_healthy` | `initContainers` / `readinessProbe` | `check` in `group` stanza | startup probe |
| Liveness | `healthcheck` → `GET /health` | `livenessProbe` → `GET /health` | `check` → `GET /health` | liveness probe → `GET /health` |
| Readiness | `GET /readiness` (checked by `post-deploy-verify.sh`, not Docker's healthcheck) | `readinessProbe` → `GET /readiness` | `check` → `GET /readiness` | not natively supported — poll externally |
| Metrics | `GET /metrics` (Prometheus text) | same, scraped by a `ServiceMonitor` | same, scraped by Consul/Prometheus | same, scraped externally |
| Rollback unit | previous `IMAGE_TAG` | previous `Deployment` revision (`kubectl rollout undo`) | previous job version | previous revision (traffic split back) |

## 6. Known limitations (tracked, not blocking WP-03)

- Recreate-in-place, not true zero-downtime — see §5.
- No automated TLS cert renewal (documented in `ProductionDeploymentGuide.md`).
- `docker compose ps --format '{{.Health}}'` reports empty string for
  services without a healthcheck (`nginx`, `mongo`'s own container has one,
  `frontend` has one) — `deploy.sh`'s wait-for-healthy loop treats "no
  healthcheck" as trivially satisfied, since Compose can't gate on a check
  that doesn't exist; `nginx` reachability is instead proven by
  `post-deploy-verify.sh` hitting it end-to-end.
