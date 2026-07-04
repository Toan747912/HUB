# Incident Response Guide — AI Mentor OS (Apps/ai-backend)
**Workstream:** WP-06 — Operations, Monitoring & Closed Beta Readiness
**Date:** 2026-07-03

---

## 1. Severity levels

| Severity | Definition | Examples | Target response time |
|---|---|---|---|
| **SEV-1 (Critical)** | Full or near-full outage, or data loss/integrity risk | `MongoDisconnected` alert (all Goal persistence down), all retained backups fail verification (`DisasterRecoveryGuide.md` scenario 7), confirmed data breach | Immediate — drop other work |
| **SEV-2 (High)** | Significant degradation, no full outage, or a security event requiring containment | `HighErrorRate` alert, `RedisUnavailable` (degraded, not down — see `ObservabilityRunbook.md`), `REFRESH_TOKEN_REUSE_DETECTED`, sustained `HighAPILatency` | Within the same working session |
| **SEV-3 (Medium)** | Localized or non-user-facing degradation | `BullMQStalledJobs`, `OutboxBacklogHigh` (durable, delivery delayed, not lost), single non-critical route slow | Next business day unless trending toward SEV-2 |
| **SEV-4 (Low)** | Cosmetic, or a documented known gap surfacing as expected behavior | e.g. a scheduled backup didn't run because no scheduler is wired up (known gap, `BackupRunbook.md`) — track, don't page | Backlog |

**No paging tool or on-call rotation exists today** (see `OperationsHandbook.md` §8, `GoLiveApproval.md` blockers) — until one exists, severity drives *response urgency by whoever is available*, not automated escalation.

## 2. Incident classification

At detection, classify by answering, in order:

1. **Is data at risk or already lost?** → floor is SEV-2, likely SEV-1.
2. **Is this security-related** (auth, RBAC, secrets, suspicious access pattern)? → route through `Apps/ai-backend/SecurityRunbook.md` in parallel with this guide; security incidents get their own evidence-collection discipline (audit-event queries) even at lower severity.
3. **Is this deploy-related** (started right after a deploy/rollback)? → the technical response starts with `RollbackProcedure.md` regardless of severity; classify severity based on user impact observed, not on how the fix will go.
4. **Match the symptom to `RunbookIndex.md`** for the technical remediation path.

## 3. Communication flow

No chat-ops/paging integration exists in this repo today (documented gap). Until one is built:

1. **Declare**: state the classification (severity + one-line symptom) in whatever channel the team currently uses for this — placeholder, to be filled once a real channel is designated (`OperationsHandbook.md` §8).
2. **Update cadence**: SEV-1/2 — update at least every 30 minutes until resolved or downgraded, even if the update is "still investigating." SEV-3/4 — update on state change only.
3. **Resolve**: state resolution, root cause (if known), and whether a follow-up (bug fix, gap closure) is needed.
4. **Post-incident**: schedule the RCA (§8) for SEV-1/SEV-2 within 3 business days.

## 4. Investigation steps

Standard order, regardless of runbook:

1. `docker compose -f docker-compose.production.yml ps` — what's actually unhealthy.
2. `GET /health`, `GET /readiness` — process alive? which dependency is failing (readiness body's `checks`)?
3. `GET /metrics` — dependency-up gauges, request/error rates, queue delay — faster than grepping logs for a first read.
4. Grafana dashboard (`ai-backend-overview.json`) if a live instance is deployed (see `MonitoringCertification.md` — not confirmed live as of this writing); otherwise treat `/metrics`' raw text output as the substitute.
5. Structured logs (stdout, JSON lines) filtered by time window and, if available, the `x-trace-id` from a user report.
6. `audit_events` collection for anything Goal-mutation or auth/security related.
7. Match to the specific runbook in `RunbookIndex.md` for symptom-specific procedures.

## 5. Evidence collection

Before remediating (or as close to "before" as user impact allows):

- Save `docker compose logs --tail=500 <service>` for every service touched by the incident — container logs are not centrally aggregated or retained beyond the container's own log file (`ApplicationCrashRunbook.md` Known gaps), so this is the only copy that will exist once the container is recreated.
- Record exact timestamps (UTC) of: first symptom observed, classification, each remediation action taken, resolution.
- For security incidents, the canonical evidence trail is the `audit_events` collection — see `SecurityRunbook.md` for the specific query per incident type (`REFRESH_TOKEN_REUSE_DETECTED`, `PERMISSION_DENIED`, etc.). Do not rely on memory of what the query showed — copy the actual result set.
- For deploy-related incidents, `Infrastructure/deployment/deployments.log` and `recovery.log` already contain a structured record — attach the relevant lines, don't summarize from memory.

## 6. Recovery actions

Recovery is runbook-specific — see `RunbookIndex.md`. Two cross-cutting rules:

- **Restore service before root-causing** when user impact is ongoing (SEV-1/SEV-2). Every existing runbook in this repo already follows this pattern (e.g. `DeploymentRunbook.md` §4: roll back before continuing to debug).
- **Always run recovery validation** before declaring an incident resolved: `Infrastructure/scripts/post-deploy-verify.sh` at minimum; add the runbook-specific checks (e.g. `DisasterRecoveryGuide.md`'s "Health validation" application-level spot-checks) for anything involving data.

## 7. Post-incident review process

Required for every SEV-1 and SEV-2 incident, recommended for recurring SEV-3s:

1. Timeline reconstruction from the evidence collected in §5.
2. Root Cause Analysis (§8).
3. Identify whether the incident exposed a **known, already-documented gap** (this repo's runbooks candidly list many — e.g. no crash-loop alert, no disk-usage alert, no cert-expiry alert) versus a **new, previously-unknown gap**. Known gaps that caused or worsened an incident should be re-prioritized, not re-discovered as new findings.
4. File follow-up work (bug fix, new alert rule, runbook update) — do not close the incident without at least one concrete follow-up action or an explicit "no action needed" rationale.
5. Update the relevant runbook if the incident revealed the procedure was wrong or incomplete — these documents are only useful if they stay accurate.

## 8. Root Cause Analysis (RCA)

Minimum RCA content:

| Field | Content |
|---|---|
| Summary | One paragraph: what happened, user impact, duration |
| Timeline | Timestamped sequence from detection to resolution |
| Root cause | The actual mechanism, not just the symptom (e.g. not "Mongo was down" but *why* Mongo was down) |
| Detection | How was it detected — alert, user report, manual check? If not by alert, is there a monitoring gap (`MonitoringCertification.md`) that should be closed? |
| Contributing factors | Known gaps that made this worse or harder to diagnose (cite the specific runbook's "Known gaps" section if applicable) |
| Corrective actions | Concrete, owned, dated follow-ups |
| Recurrence risk | Could this happen again before corrective actions land? |

RCAs are not currently stored in a dedicated location in this repo — until one is designated, file them alongside this guide's folder (`Docs/14_Operations/incidents/` is a reasonable convention to adopt) or wherever the team's existing documentation practice puts dated records.
