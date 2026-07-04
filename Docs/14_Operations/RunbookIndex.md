# Runbook Index — AI Mentor OS (Apps/ai-backend)
**Workstream:** WP-06 — Operations, Monitoring & Closed Beta Readiness
**Date:** 2026-07-03

Single entry point to every operational runbook. Most already existed (WP-03/WP-04/WP-05/Batch 8-9 deliverables) — this index links to them rather than duplicating their content, per WP-06 scope. Six runbooks were newly written for WP-06 to close gaps the spec calls for that nothing previously covered.

| # | Runbook | Location | Status |
|---|---|---|---|
| 1 | Deployment | [`../../DeploymentRunbook.md`](../../DeploymentRunbook.md) | Existing (WP-03) |
| 2 | Rollback | [`../../RollbackProcedure.md`](../../RollbackProcedure.md) | Existing (WP-03) |
| 3 | Database backup | [`../../Apps/ai-backend/BackupRunbook.md`](../../Apps/ai-backend/BackupRunbook.md) | Existing (WP-04) |
| 4 | Database restore | [`../../Apps/ai-backend/RestoreRunbook.md`](../../Apps/ai-backend/RestoreRunbook.md) | Existing (WP-04) |
| 5 | Redis failure | [`../../Apps/ai-backend/DisasterRecoveryGuide.md`](../../Apps/ai-backend/DisasterRecoveryGuide.md) (scenario 2) + [`../../Apps/ai-backend/ObservabilityRunbook.md`](../../Apps/ai-backend/ObservabilityRunbook.md) (`#redis-unavailable`) | Existing (WP-04 / Batch 8) |
| 6 | MongoDB failure | [`../../Apps/ai-backend/DisasterRecoveryGuide.md`](../../Apps/ai-backend/DisasterRecoveryGuide.md) (scenario 1) + [`../../Apps/ai-backend/ObservabilityRunbook.md`](../../Apps/ai-backend/ObservabilityRunbook.md) (`#mongo-disconnected`) | Existing (WP-04 / Batch 8) |
| 7 | BullMQ queue failure | [`../../Apps/ai-backend/ObservabilityRunbook.md`](../../Apps/ai-backend/ObservabilityRunbook.md) (`#bullmq-stalled-jobs`, `#outbox-backlog-high`, `#circuit-breaker-open`) | Existing (Batch 8) |
| 8 | Application crash | [`../../Apps/ai-backend/ApplicationCrashRunbook.md`](../../Apps/ai-backend/ApplicationCrashRunbook.md) | **New (WP-06)** |
| 9 | High CPU | [`../../Apps/ai-backend/HighCPURunbook.md`](../../Apps/ai-backend/HighCPURunbook.md) | **New (WP-06)** |
| 10 | High memory | [`../../Apps/ai-backend/HighMemoryRunbook.md`](../../Apps/ai-backend/HighMemoryRunbook.md) | **New (WP-06)** |
| 11 | Disk full | [`../../Apps/ai-backend/DiskFullRunbook.md`](../../Apps/ai-backend/DiskFullRunbook.md) | **New (WP-06)** (expands `DisasterRecoveryGuide.md` scenario 6) |
| 12 | Certificate renewal | [`../../Apps/ai-backend/CertificateRenewalRunbook.md`](../../Apps/ai-backend/CertificateRenewalRunbook.md) | **New (WP-06)** |
| 13 | Secret rotation | [`../../Apps/ai-backend/SecretRotationRunbook.md`](../../Apps/ai-backend/SecretRotationRunbook.md) | **New (WP-06)**, operational counterpart to [`SecretsManagementGuide.md`](../../Apps/ai-backend/SecretsManagementGuide.md) §5 |

## Related, not itself a runbook

| Document | Location | Why it's here |
|---|---|---|
| Security incident response | [`../../Apps/ai-backend/SecurityRunbook.md`](../../Apps/ai-backend/SecurityRunbook.md) | Covers compromised tokens, brute-force, API key compromise, role changes — read alongside [IncidentResponseGuide.md](IncidentResponseGuide.md) for security-classified incidents |
| Secrets inventory & rotation policy | [`../../Apps/ai-backend/SecretsManagementGuide.md`](../../Apps/ai-backend/SecretsManagementGuide.md) | The "what/why" behind runbook #13 |
| Disaster recovery targets (RPO/RTO) & chaos drills | [`../../Apps/ai-backend/DisasterRecoveryGuide.md`](../../Apps/ai-backend/DisasterRecoveryGuide.md) | Cross-cutting reference for runbooks #5, #6, #11 |
| Deployment topology rationale | [`../../DeploymentArchitecture.md`](../../DeploymentArchitecture.md) | Background for runbooks #1, #2 |

## Using this index during an incident

1. Match the symptom to a row above.
2. If the symptom doesn't map cleanly to one runbook (e.g. high latency with an unclear cause), start with [`ObservabilityRunbook.md`](../../Apps/ai-backend/ObservabilityRunbook.md)'s dashboard-reading section to narrow it down before picking a runbook.
3. Follow [IncidentResponseGuide.md](IncidentResponseGuide.md) for classification and communication in parallel with technical remediation — don't wait until the incident is resolved to classify it.

## Known gap

No runbook in this index has a corresponding automated drill beyond what `DisasterRecoveryGuide.md` already scripts (`dr-rehearsal.sh` covers only Mongo data loss and container loss). Application crash, high CPU/memory, disk full, certificate renewal, and secret rotation are all currently **manual-procedure-only, unrehearsed** runbooks — see [OperationsReadinessReview.md](OperationsReadinessReview.md) §Operational Drills.
