# Operations Handbook — AI Mentor OS (Apps/ai-backend)
**Workstream:** WP-06 — Operations, Monitoring & Closed Beta Readiness
**Date:** 2026-07-03
**Scope note:** This handbook governs the day-to-day operation of the *engineering-track* deliverable, `Apps/ai-backend` and its production stack (`docker-compose.production.yml`). It is intentionally separate from the `Docs/00_Vision` … `11_Decisions` product-design track, which governs a different, longer-horizon workstream (see [README.md](README.md) in this folder for why the two tracks currently disagree about project maturity, and how to read that).

---

## 1. System overview

`Apps/ai-backend` is a NestJS service implementing the Goal/Roadmap/Learning-Session domain (per `Docs/03_Domain_Model/`) with:

- **Persistence:** MongoDB (`ai-backend` database) — Goals, audit events, users, refresh tokens, API keys.
- **Caching / coordination:** Redis — distributed locks (goal/assessment/recommendation/roadmap), rate limiting, brute-force protection, BullMQ broker.
- **Async processing:** BullMQ queues, backed by a durable Mongo-based outbox (writes are never lost even if Redis/BullMQ is down — they queue in the outbox and drain via `OutboxRelayService` on recovery).
- **Observability:** Prometheus metrics (`GET /metrics`), OpenTelemetry traces (console/in-memory exporters only — no live collector wired, see [MonitoringCertification.md](MonitoringCertification.md)), structured JSON logs to stdout, MongoDB-backed audit trail.
- **Frontend:** Next.js app, served standalone, reverse-proxied by nginx alongside the API.
- **Edge:** nginx terminates TLS, routes `/api|health|readiness|metrics` to `ai-backend`, everything else to `frontend`.

## 2. Architecture summary

```
Internet → nginx (TLS, :443) → ai-backend (:3001, internal) → MongoDB, Redis
                              → frontend  (:3000, internal)
```

- Only `nginx` publishes ports to the host (`80`/`443`); `ai-backend`, `frontend`, `mongo`, `redis` are `expose`-only (internal Docker network), reachable solely through the edge or by other containers.
- Startup order is enforced by Compose `depends_on: condition: service_healthy`: `mongo`/`redis` → `ai-backend` → `frontend` → `nginx`. See `../../DeploymentArchitecture.md` for the full rationale.
- Every service that can be probed has a healthcheck; `docker compose ps` is the fastest first signal for "what's actually broken."

## 3. Environment topology

| Environment | Compose file | TLS | Secret source | Notes |
|---|---|---|---|---|
| Local dev | `docker-compose.yml` | None | Plaintext env / local `.env` | Includes a separate `ai-service` (port 8000) not present in production compose — verify before assuming dev/prod parity. |
| Production | `docker-compose.production.yml` | nginx, `./certs/{fullchain,privkey}.pem` | Host env vars via `${VAR:?required}` fail-fast interpolation | No staging environment exists today — this is a documented gap (§9). |

There is no `.env.example` in the repository (confirmed absent repo-wide) — the required variable list must currently be assembled from `ProductionDeploymentGuide.md`'s environment table, `docker-compose.production.yml`'s `:?required` markers, and `SecretsManagementGuide.md`'s secret inventory. Creating a real `.env.example` is a recommended follow-up (§9).

## 4. Operational responsibilities

| Area | Primary reference |
|---|---|
| Deploying / rolling back | [RunbookIndex.md](RunbookIndex.md) → Deployment, Rollback |
| Backup / restore | [RunbookIndex.md](RunbookIndex.md) → Database Backup, Database Restore |
| Dependency failures (Mongo/Redis/BullMQ) | [RunbookIndex.md](RunbookIndex.md) |
| Resource exhaustion (CPU/memory/disk) | [RunbookIndex.md](RunbookIndex.md) |
| Security incidents | `Apps/ai-backend/SecurityRunbook.md` |
| Certificate / secret lifecycle | [RunbookIndex.md](RunbookIndex.md) → Certificate Renewal, Secret Rotation |
| Monitoring / alerting | [MonitoringCertification.md](MonitoringCertification.md) |
| Incident handling process | [IncidentResponseGuide.md](IncidentResponseGuide.md) |
| Service-level targets | [SLO_SLI_Definition.md](SLO_SLI_Definition.md) |

## 5. Daily operational checklist

- [ ] `docker compose -f docker-compose.production.yml ps` — all services `healthy`, none `restarting`.
- [ ] `GET /health` and `GET /readiness` return 200 (readiness body's `checks` all green).
- [ ] Spot-check the Grafana dashboard (`ai-backend-overview.json`) rows 1–5 for any panel trending toward an alert threshold (`ai-backend-alerts.yml`) — do this even though no live Prometheus/Grafana instance is confirmed deployed yet (§ MonitoringCertification.md); if none is deployed, substitute a manual `curl /metrics` scan of the same signals.
- [ ] No new entries in `Infrastructure/deployment/recovery.log` with `"result":"failed"` since the last check.
- [ ] Disk headroom check (`df -h`) — no in-app alert exists for this yet (`DiskFullRunbook.md` Known gaps).

## 6. Weekly maintenance checklist

- [ ] Run `verify-backup.sh --restore-test` against the most recent backup (backups are not scheduled automatically — confirm one was actually taken this week, per `BackupRunbook.md`).
- [ ] Review `audit_events` for anomalous patterns (`SecurityRunbook.md`'s `PERMISSION_DENIED` aggregation query is a good weekly scan, not just an incident-time one).
- [ ] Review dependency-audit CI output (`.github/workflows/dependency-audit.yml`) for new advisories.
- [ ] Confirm certificate expiry is >30 days out (`openssl x509 -enddate -noout -in certs/fullchain.pem`) — no automated expiry alert exists yet (`CertificateRenewalRunbook.md`).

## 7. Monthly maintenance checklist

- [ ] Run a full DR rehearsal (`dr-rehearsal.sh --scenario mongo-data-loss --confirm` and `--scenario container-loss --confirm`) and record results in `RecoveryMetricsReport.md`.
- [ ] Review `deployments.log` and `recovery.log` for trend drift against the RTO/RPO targets in `DisasterRecoveryGuide.md`.
- [ ] Review this handbook and the runbook set for drift against the actual codebase (alert rules, endpoints, env vars) — these documents describe behavior as of 2026-07-03 and will go stale as the service changes.
- [ ] Re-run [ClosedBetaChecklist.md](ClosedBetaChecklist.md) if still pre-launch, or the equivalent GA readiness pass once beta exits.

## 8. Escalation contacts

**Placeholder — not yet populated.** No on-call rotation, paging tool (PagerDuty/Opsgenie/etc.), or named escalation path exists in this repository at the time of writing. Before Closed Beta traffic begins, this section must be filled with:
- Primary/secondary on-call identity and contact method.
- Escalation path for each severity level defined in [IncidentResponseGuide.md](IncidentResponseGuide.md).
- Vendor/infra contacts (hosting provider, DNS/cert authority, MongoDB/Redis hosting if managed externally).

This gap is also recorded as a blocker in [GoLiveApproval.md](GoLiveApproval.md).

## 9. Maintenance windows

No formal maintenance-window schedule exists today. Recommended baseline until a real one is agreed:

- Secret rotations requiring full-stack restart (`MONGO_ROOT_USER`/`PASSWORD`, `JWT_SECRET`/`REFRESH_SECRET`) — schedule and announce in advance; these force all users to re-authenticate or cause brief downtime (`SecretRotationRunbook.md`).
- Routine deploys — `deploy.sh` is designed for zero-downtime-intent rolling recreation under Compose's health-gated startup order, but has not been load-tested for true zero-downtime; treat deploys as low-risk-but-not-guaranteed-invisible until proven otherwise.

## 10. Change management process

See [OperationsReadinessReview.md](OperationsReadinessReview.md) §Change Management and §8 of the WP-06 spec for release/rollback/hotfix approval flow. In short, today: any operator with deploy access can run `deploy.sh`/`rollback.sh` directly — there is no enforced approval gate in tooling (CI runs tests/lint/security-audit on PRs, per `.github/workflows/ci.yml`, but does not itself gate production deploys, which are a separate manual/`release.yml`-tag-triggered step). Formalizing an approval requirement is a recommended follow-up before General Availability, not a blocker for a small Closed Beta.
