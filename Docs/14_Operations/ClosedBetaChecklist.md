# Closed Beta Checklist — AI Mentor OS (Apps/ai-backend)
**Workstream:** WP-06 — Operations, Monitoring & Closed Beta Readiness
**Date:** 2026-07-03

Legend: ✅ met · 🟡 partially met / documented gap accepted at this scale · ❌ not met, blocking

---

## Infrastructure

| Item | Status | Evidence |
|---|---|---|
| Production Compose stack with health-gated startup order | ✅ | `docker-compose.production.yml`, `DeploymentArchitecture.md` |
| TLS termination | ✅ | nginx, `certs/{fullchain,privkey}.pem` |
| Automated cert renewal | ❌ | `CertificateRenewalRunbook.md` — manual only |
| Staging environment | ❌ | Does not exist — dev compose and production compose are the only two topologies |
| `.env.example` / consolidated env reference | ❌ | `OperationsHandbook.md` §3 |

## Security

| Item | Status | Evidence |
|---|---|---|
| JWT/RBAC/rate-limiting/audit foundation | ✅ | `SecurityCertificationChecklist.md` — 57/61 PASS, 0 failed |
| No secrets committed to git | ✅ | `SecretsManagementGuide.md` §1, with a real regression test |
| Secrets-vault integration | 🟡 | Plain env vars, accepted gap for Closed Beta scale per `SecretsManagementGuide.md` §3 |
| External penetration test | ❌ | `SecurityCertificationChecklist.md` §11.1 — not performed |
| Production user-provisioning flow | ❌ | `POST /auth/register` is dev/seed-oriented and unrestricted — `SecurityCertificationChecklist.md` §11.2 |
| Secret rotation runbook | ✅ | `SecretRotationRunbook.md` (new, WP-06) |

## Reliability

| Item | Status | Evidence |
|---|---|---|
| Backup/restore automation | ✅ | `BackupRunbook.md`, `RestoreRunbook.md` |
| Backup scheduling | ❌ | No cron/timer wired — operator-triggered only |
| Off-host backup replication | ❌ | Backups live on the same host they protect — `DisasterRecoveryGuide.md` calls this the highest-priority reliability gap |
| Backup verification | 🟡 | Procedure exists and is required before trusting a backup (`verify-backup.sh`), but results aren't durably logged — `SLO_SLI_Definition.md` §6 |
| DR rehearsal automation | 🟡 | 2 of 6+ disaster scenarios are chaos-automated (`dr-rehearsal.sh`); rest are manual procedures. The automation itself has not been run against a live stack, only syntax-checked (`ReliabilityCertificationChecklist.md`) |

## Deployment

| Item | Status | Evidence |
|---|---|---|
| Automated deploy with pre-check/backup/health-gate/auto-rollback | ✅ | `DeploymentRunbook.md`, `RollbackProcedure.md` |
| Immutable tagged release images | ✅ | `ReleaseWorkflow.md` |
| Formal deploy-approval gate | 🟡 | CI gates PR merge, not the production-deploy action itself; acceptable at Closed Beta scale, revisit before GA — `OperationsHandbook.md` §10 |

## Accessibility

| Item | Status | Evidence |
|---|---|---|
| Accessibility review | ❌ | No accessibility audit found anywhere in this repository's documentation set — out of scope for every prior WP/Batch; not previously assigned to any workstream |

## Performance

| Item | Status | Evidence |
|---|---|---|
| P95 latency instrumented | ✅ | `http_request_duration_seconds`, `HighAPILatency` alert |
| Load testing under realistic Closed Beta traffic | ❌ | `SecurityCertificationChecklist.md` §11.4 flags this for the rate limiter specifically; no broader load test exists for the service overall |
| CPU/memory capacity headroom verified | ❌ | Cannot be verified — no CPU/memory metrics exist at all (`MonitoringCertification.md`) |

## Documentation

| Item | Status | Evidence |
|---|---|---|
| Operations handbook | ✅ | `OperationsHandbook.md` (this workstream) |
| Runbook index | ✅ | `RunbookIndex.md` (this workstream) |
| Incident response guide | ✅ | `IncidentResponseGuide.md` (this workstream) |
| SLO/SLI definitions | ✅ | `SLO_SLI_Definition.md` (this workstream) |

## Known issues

See [OperationsReadinessReview.md](OperationsReadinessReview.md) §6 for the full consolidated blocker list. Restated here for the checklist's own record: 4 Critical (live monitoring, CPU/memory/disk metrics, alert routing, escalation contacts), several High/Medium/Low items that are acceptable to carry into a small Closed Beta but must be tracked, not forgotten.

## Support process

**Not yet defined.** No support-ticket system, user-facing status page, or documented support SLA exists in this repository. This is a product/operations decision outside WP-06's technical scope, but its absence should be surfaced to whoever owns the Closed Beta launch decision — users hitting an issue today have no defined channel to report it through.

## Feedback collection

**Not yet defined.** No feedback mechanism (in-app, survey, dedicated channel) exists in the codebase or documentation. Same status as Support process above — a product decision, flagged here because a Closed Beta without a feedback loop defeats much of the purpose of running one.

## Release approval

No formal release-approval workflow exists beyond CI checks gating PR merges (`.github/workflows/ci.yml`) and `release.yml`'s tag-triggered build. See [GoLiveApproval.md](GoLiveApproval.md) for this document's own approval recommendation.

---

## Overall assessment

**Not ready to open to real Closed Beta users today** without accepting the Critical gaps in §6 of `OperationsReadinessReview.md` as a conscious risk — most acutely, the platform would be running with no live alerting, meaning an outage or resource exhaustion event could go undetected until a user reports it. See [GoLiveApproval.md](GoLiveApproval.md) for the formal classification.
