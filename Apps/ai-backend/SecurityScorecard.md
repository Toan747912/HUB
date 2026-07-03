# WP-05 — Security Scorecard
**Scope:** `Apps/ai-backend`
**Date:** 2026-07-03

Scoring: 0–100 per category. 100 = no known gaps and independently verified (test/scan evidence exists). Deductions are per-finding, weighted by severity, not a subjective feel — see each category's "Basis" for the arithmetic.

---

## Score

| Category | Score | Basis |
|---|---|---|
| Application | **62 / 100** | Strong auth/RBAC/audit foundation (Batch 9), but 2 fully unauthenticated controllers (`MigrationController`, `AiRuntimeController`) is a concrete, currently-exploitable High-severity gap. -30 for the unauthenticated controllers, -8 for unscoped `PermissionGuard` routes (fail-open when no `@RequirePermissions`) on 4 controllers. |
| Infrastructure | **80 / 100** | TLS 1.2/1.3 termination, HSTS/X-Frame-Options/Referrer-Policy at the nginx edge, closed-by-default CORS, non-root container user, secrets not committed. -20 for no secrets-vault (accepted at this scale), Mongo root creds used for routine app access instead of a scoped DB user. |
| Deployment | **75 / 100** | Multi-stage Docker build, `npm ci` reproducible installs, fail-fast required env vars in compose, healthchecks wired for all services. -15 for a legacy insecure `Dockerfile` (root user, `npm install`) still present in the repo. -10 for Swagger UI mounted with no env-gate. |
| Dependencies | **55 / 100** | 0 critical / **3 high / 11 moderate** `npm audit` findings, all requiring a semver-major NestJS 10→11 migration to close — no quick patch exists. -35 for the High findings (`lodash` code injection, `multer` DoS chain), -10 for the Moderate volume, all of which are outstanding, not mitigated by version pins alone. |
| Secrets | **90 / 100** | No secrets in git (verified + regression-tested), fail-fast env-var pattern, `.gitignore`/`.dockerignore` both correctly scoped. -10 for no automated rotation and no vault (both explicitly accepted gaps at current scale, not zero-cost). |
| Containers | **58 / 100** | Non-root user, minimal Alpine base, dev deps excluded from runtime, no baked-in secrets. **-30 because no CVE scanner (Trivy/Grype/authenticated Scout) has ever actually run against this image** — the WP-05 quality gate "container scan completed" is unmet, not just imperfect. -12 for the legacy `Dockerfile`. |
| Monitoring | **85 / 100** | Comprehensive security audit trail (`LOGIN_SUCCESS/FAILED`, `REFRESH_TOKEN_REUSE_DETECTED`, `PERMISSION_GRANTED/DENIED`, `REGISTRATION_ROLE_ESCALATION_BLOCKED`), Prometheus metrics, tracing via OpenTelemetry. -15 because the two unauthenticated controllers produce **no attributable audit trail** (no `userId` to log when there's no auth) — the monitoring gap is a direct consequence of the A01 gap, not independent. |
| Operations | **70 / 100** | Incident-response runbook exists and is concrete (query patterns, revocation procedures). Dependency-audit CI job exists and runs daily. -20 because that CI job (`npm audit --audit-level=high`) would **currently fail** and this is the first time anyone looked at the result — indicates the daily scan's output hasn't been triaged as a routine practice. -10 for no external pentest ever performed. |

## Overall

**Weighted average: 71.9 / 100 → Overall Risk: MEDIUM**

Weighting: Application and Dependencies count double (the two categories with confirmed High-severity, currently-live findings); all others count single.

```
(62*2 + 80 + 75 + 55*2 + 90 + 58 + 85 + 70) / 10 = 71.9
```

## Why MEDIUM, not HIGH or LOW

- **Not LOW**: two controllers are reachable with zero authentication today (`/migration/*`, `/ai/execute`), and 3 High-severity npm advisories ship in the production image. Both are real, not theoretical.
- **Not HIGH/CRITICAL**: there is no evidence of a currently-exploited issue, no secret leakage, no critical-severity CVE, and the platform's core auth/RBAC/audit system (the highest-blast-radius component) is well-built and independently tested (198/198 tests, live smoke-tested). Every finding in this scorecard has a narrow, well-understood fix — this is a punch list, not a redesign.

## Path to LOW risk (recommended before Closed Beta, not GA)

1. Add `@UseGuards(JwtAuthGuard, PermissionGuard)` to `MigrationController` and `AiRuntimeController` (closes the single highest-weighted finding — Application score, ~+25).
2. Run a real container CVE scan (Trivy in CI) at least once and triage the result (Containers score, ~+20).
3. Triage and either fix or formally accept-with-mitigation the 3 High `npm audit` findings ahead of the NestJS 10→11 migration (Dependencies score, ~+15).
4. Delete or rename the legacy root-running `Dockerfile` (Deployment + Containers, ~+8 combined).
5. Gate Swagger UI mounting behind a `NODE_ENV !== 'production'` check, or put it behind auth (Deployment, ~+5).

None of these require new infrastructure or a design change — see [SecurityHardeningReport.md](SecurityHardeningReport.md) for the consolidated, sequenced remediation plan.
