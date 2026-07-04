# Production Deployment Guide

Covers `docker-compose.production.yml`, the production Dockerfiles, and `nginx.conf`.

## Architecture

```
Internet ──▶ nginx (80/443, TLS termination)
               ├─▶ /api, /health, /readiness, /metrics ──▶ ai-backend:3001
               └─▶ everything else                       ──▶ frontend:3000

ai-backend ──▶ mongo:27017 (internal only)
ai-backend ──▶ redis:6379  (internal only)
```

`mongo` and `redis` are not published to the host — only reachable from other
containers on the compose network. `nginx` is the only container exposed on
the host, on ports 80 and 443.

## Required environment variables

Set these in a `.env` file next to `docker-compose.production.yml` (do not
commit it) or inject them via your host's secret manager. Compose will refuse
to start if any `:?` variable below is missing.

| Variable | Used by | Notes |
|---|---|---|
| `MONGO_ROOT_USER` | mongo, ai-backend | Mongo root user |
| `MONGO_ROOT_PASSWORD` | mongo, ai-backend | Mongo root password |
| `REDIS_PASSWORD` | redis, ai-backend | Redis AUTH password |
| `JWT_SECRET` | ai-backend | Access-token signing secret |
| `REFRESH_SECRET` | ai-backend | Refresh-token signing secret |
| `CORS_ORIGIN` | ai-backend | Comma-separated allowed origins, e.g. `https://app.example.com` |
| `NEXT_PUBLIC_BACKEND_URL` | frontend (build arg) | Public URL the browser uses to reach the API, e.g. `https://app.example.com/api` |

`ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL_SECONDS`, `REQUEST_BODY_LIMIT`,
`API_KEY_HEADER`, `ALLOW_SELF_ASSIGNED_ROLES` are optional — see
[security.config.ts](Apps/ai-backend/src/infrastructure/security/secrets/security.config.ts)
for defaults.

## TLS certificates

`nginx` mounts `./certs` read-only into `/etc/nginx/certs`. Place:

- `certs/fullchain.pem`
- `certs/privkey.pem`

For a real domain, obtain these via Let's Encrypt (certbot) and set up
renewal (e.g. a host cron job that runs `certbot renew` and reloads the
`nginx` container). Self-signed certs work for internal/staging use — do not
ship them to closed beta users' browsers.

## Build and run

```bash
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d
docker compose -f docker-compose.production.yml ps
```

All app containers expose Docker healthchecks (`ai-backend`: `GET /health`;
`frontend`: `GET /`; `mongo`/`redis`: native ping). `ai-backend` and
`frontend` won't be marked healthy until their dependencies
(`mongo`+`redis`, and `ai-backend`, respectively) report healthy first,
because of the `depends_on: condition: service_healthy` ordering.

## Graceful shutdown

`ai-backend` calls `app.enableShutdownHooks()` in
[main.ts](Apps/ai-backend/src/main.ts), so Nest lifecycle hooks
(`OnModuleDestroy`) run on `SIGTERM`. Docker sends `SIGTERM` on
`docker compose stop` / `down` and waits up to the default 10s grace period
before `SIGKILL` — increase with `stop_grace_period` on the `ai-backend`
service if in-flight outbox/BullMQ jobs need longer to drain.

## Rolling out a new build

```bash
docker compose -f docker-compose.production.yml build ai-backend frontend
docker compose -f docker-compose.production.yml up -d --no-deps ai-backend frontend
```

`--no-deps` avoids recreating `mongo`/`redis` unnecessarily. This is a
recreate-in-place rollout, not zero-downtime blue/green — see
`DeploymentRunbook.md` (WP-03) for a blue/green procedure once you're running
more than one host.

## Image size / build notes

- Both `Dockerfile.production` files are multi-stage: a `deps`/`build` stage
  with full `node_modules` and dev dependencies, then a slim runtime stage
  with only production dependencies (`ai-backend`) or the Next.js
  `standalone` output (`frontend`, via `output: 'standalone'` in
  [next.config.js](Apps/frontend/next.config.js)).
- Both runtime stages run as a non-root user (`nestjs` / `nextjs`).
- `.dockerignore` in each app excludes `node_modules`, test files, and `.env*`
  from the build context.

## Known gaps (tracked separately, not blocking this deliverable)

- No centralized env-schema validation (`process.env` is read ad hoc across
  config files) — see WP-03/WP-06 follow-up.
- No automated cert renewal wired into compose — manual/cron for now.
- Rollout above is recreate-in-place; true blue/green needs a load balancer
  in front of two ai-backend/frontend stacks (WP-03).
