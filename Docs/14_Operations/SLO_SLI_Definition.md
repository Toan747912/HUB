# SLO / SLI Definition — AI Mentor OS (Apps/ai-backend)
**Workstream:** WP-06 — Operations, Monitoring & Closed Beta Readiness
**Date:** 2026-07-03

All measurement methods below assume live Prometheus/Grafana infrastructure that, per [MonitoringCertification.md](MonitoringCertification.md), **does not exist yet**. Each objective is marked `MEASURABLE TODAY` (via existing metrics, once scraped) or `NOT YET MEASURABLE` (metric doesn't exist at all).

---

## 1. Availability

- **SLI:** proportion of `/health` + dependency checks (`/readiness`) returning healthy over total checks, or equivalently `service_dependency_up` uptime for `mongodb`/`redis`.
- **SLO:** ≥ 99.5%.
- **Measurement method:** `service_dependency_up{dependency=~"mongodb|redis"}` averaged over the review window; alternatively, external blackbox polling of `/health` through nginx (no such external prober exists today — recommend adding one, since an in-process metric can't detect the whole process being unreachable).
- **Status:** `MEASURABLE TODAY` once scraped — metric exists (`metrics.controller.spec.ts`), no live scrape target exists yet.
- **Review frequency:** weekly during Closed Beta.

## 2. API success rate

- **SLI:** `1 - (sum(rate(http_requests_total{status=~"5.."}[window])) / sum(rate(http_requests_total[window])))`.
- **SLO:** ≥ 99%.
- **Measurement method:** same expression already used by the `HighErrorRate` alert (`ai-backend-alerts.yml`), evaluated over a longer rolling window (e.g. 7d) for the SLO report rather than the 5m alerting window.
- **Status:** `MEASURABLE TODAY` once scraped.
- **Review frequency:** weekly.

## 3. P95 latency

- **SLI:** `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[window])) by (le))`.
- **SLO:** ≤ 500 ms.
- **Note:** the existing `HighAPILatency` alert threshold is 1000 ms, not 500 ms — this SLO is **tighter than the current alert**. Either the alert threshold should be revisited to page before the SLO is actually breached, or the SLO should be treated as aspirational until the alert is tightened. Flagging this discrepancy rather than silently picking one; see `OperationsReadinessReview.md`.
- **Measurement method:** per-route via the `route` label, and in aggregate.
- **Status:** `MEASURABLE TODAY` once scraped.
- **Review frequency:** weekly.

## 4. Failed deployment rate

- **SLI:** proportion of `Infrastructure/deployment/deployments.log` entries with a failure outcome (deploy that triggered automatic rollback) over total deploy attempts.
- **SLO:** ≤ 5%.
- **Measurement method:** `deployments.log` is a real, currently-populated JSON-lines file (per `DeploymentRunbook.md`) — this SLI **is measurable today without any new infrastructure**, by parsing the log directly. No dashboard exists for it yet; a simple script/query against the log file is sufficient at Closed Beta scale.
- **Status:** `MEASURABLE TODAY` (log-based, not metrics-based).
- **Review frequency:** monthly, or after any cluster of deploys.

## 5. Recovery success rate

- **SLI:** proportion of `Infrastructure/deployment/recovery.log` entries with `"result":"succeeded"` over total backup/restore/DR-rehearsal attempts.
- **SLO:** ≥ 95%.
- **Measurement method:** `recovery.log` is real and populated by `backup.sh`, `restore.sh`, and `dr-rehearsal.sh` today (per `BackupRunbook.md`, `RecoveryMetricsReport.md`) — same as §4, measurable by direct log parsing, no new infrastructure needed.
- **Status:** `MEASURABLE TODAY` (log-based).
- **Review frequency:** monthly, alongside the monthly DR rehearsal (`OperationsHandbook.md` §7).

## 6. Backup verification success

- **SLI:** proportion of backups that pass `verify-backup.sh` (with `--restore-test`) over total backups taken.
- **SLO:** 100%.
- **Measurement method:** `verify-backup.sh` run results are not currently logged to a structured file the way `backup.sh` itself is (`recovery.log` records the backup action, not a separate verification-run record) — this is a **measurement gap**: today, verification is run manually and its pass/fail isn't durably recorded unless the operator notes it elsewhere. Recommend extending `verify-backup.sh` to append its own line to `recovery.log` (type: `"verify"`) before this SLI can be tracked automatically.
- **Status:** `NOT YET MEASURABLE` (procedure exists, result isn't logged).
- **Review frequency:** N/A until measurement gap is closed; until then, treat every backup as unverified-by-default per `BackupRunbook.md`'s own instruction ("a backup is not considered valid until \[verification\] passes").

## 7. Dimensions requested by WP-06 with no current metric (flagged, not fabricated)

Per `MonitoringCertification.md` §8-10, CPU, memory, and disk have **no metric at all**, live or design-level. No SLI/SLO is defined for these here because defining a numeric target against a non-existent measurement would misrepresent readiness. Once `collectDefaultMetrics()` (or equivalent) is added, this document should be extended with CPU/memory SLOs — not before.

## 8. Summary

| SLI | SLO | Status |
|---|---|---|
| Availability | ≥ 99.5% | Measurable once scraped |
| API success rate | ≥ 99% | Measurable once scraped |
| P95 latency | ≤ 500 ms | Measurable once scraped — **note: existing alert threshold (1000ms) is looser than this SLO** |
| Failed deployment rate | ≤ 5% | Measurable today (log-based) |
| Recovery success rate | ≥ 95% | Measurable today (log-based) |
| Backup verification success | 100% | **Not measurable today** — verification result isn't logged |
| CPU / Memory / Disk | *(not defined)* | No metric exists at any level |
