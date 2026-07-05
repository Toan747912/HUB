# AI Backend — Recovery Metrics Report

> **HISTORICAL — SUPERSEDED BY WP-DB-01.** This document describes the original MongoDB/Mongoose persistence design.
> As of WP-DB-01, the canonical persistence platform is **Prisma + PostgreSQL (Supabase)**; MongoDB is no longer a
> runtime dependency. Kept for historical reference only. See DatabaseMigrationAudit.md, MigrationReport.md, and
> SupabaseCertification.md for the current state.

**Workstream:** WP-04 — Reliability, Backup & Disaster Recovery
**Audience:** operators/engineers assessing recovery health over time

---

## Where the data lives

Every `backup.sh`, `restore.sh`, `verify-backup.sh`, and `dr-rehearsal.sh` run
appends one JSON line to `Infrastructure/deployment/recovery.log` (gitignored,
same convention as WP-03's `deployments.log`). No database table or
Prometheus metric exists for this yet — see Backlog.

Record shapes (one `type` per script):

```json
{"type":"backup","timestamp":"2026-07-03T09:00:00Z","dest":"...","operator":"ci","durationMs":4200,"result":"succeeded","reason":""}
{"type":"restore","timestamp":"...","backupDir":"...","target":"mongo","operator":"...","reason":"...","durationMs":9100,"result":"succeeded"}
{"type":"verify","timestamp":"...","backupDir":"...","operator":"...","durationMs":6300,"result":"passed","failedChecks":0}
{"type":"dr-rehearsal","timestamp":"...","scenario":"mongo-data-loss","operator":"...","detectionMs":1800,"recoveryMs":9400,"result":"recovered"}
```

## Deriving recovery success rate

```bash
# overall success rate across all recovery-related events
jq -s '
  group_by(.type) |
  map({
    type: .[0].type,
    total: length,
    succeeded: ([.[] | select(.result == "succeeded" or .result == "passed" or .result == "recovered")] | length)
  }) |
  map(. + {successRate: (if .total > 0 then (.succeeded / .total) else null end)})
' Infrastructure/deployment/recovery.log
```

```bash
# restore duration percentiles (ms), for RTO tracking against DisasterRecoveryGuide.md targets
jq -s '[.[] | select(.type == "restore") | .durationMs] | sort' Infrastructure/deployment/recovery.log
```

```bash
# most recent verified backup, for RPO tracking
jq -s '[.[] | select(.type == "verify" and .result == "passed")] | sort_by(.timestamp) | last' Infrastructure/deployment/recovery.log
```

## Reading a `dr-rehearsal` record against RTO targets

`detectionMs` + `recoveryMs` together approximate wall-clock time from failure
to healthy — compare against `DisasterRecoveryGuide.md`'s RTO table
(≤15 min single-service, ≤30 min full platform). A rehearsal exceeding target
is a signal to investigate before it happens for real, not just a number to
note — treat repeated RTO breaches as a blocker to closing this workstream's
backlog items, not background noise.

## What this report cannot tell you yet

- **No dashboard.** These are raw JSON lines; there's no Grafana panel wired to them (unlike the Prometheus-backed panels in `infrastructure/observability/dashboards/` for HTTP/Mongo/Redis/BullMQ metrics). Building one requires either (a) a log-scraping exporter for `recovery.log`, or (b) porting these events into `MetricsService` (`prom-client` `Counter`/`Histogram`) the same way `outbox_pending_total` etc. are exposed — recommended next step, not done as part of WP-04.
- **No alerting.** Nothing pages if `recovery.log` shows a string of `failed` restores or the last successful backup is older than the RPO target — this must be watched manually (`jq` snippets above) until instrumented.
- **No historical retention policy for `recovery.log` itself.** It grows unbounded on the host filesystem; rotate/archive it the same way you'd rotate `deployments.log`.

## Backlog (known gaps, not implemented)

- Port `recovery.log` events into `prom-client` metrics (`backup_duration_seconds`, `restore_duration_seconds`, `recovery_outcome_total{type,result}`) so they show up in the existing Grafana dashboards and Prometheus alerting alongside `service_dependency_up`/`circuit_breaker_state`.
- No automated success-rate threshold alerting.
- No log rotation for `recovery.log`.
