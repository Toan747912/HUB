# WP-05 — Security Hardening & Production Security Certification
**Scope:** `Apps/ai-backend`
**Date:** 2026-07-03
**Input classification:** READY_FOR_SECURITY_HARDENING

This is the top-level WP-05 deliverable. It synthesizes the other seven documents in this batch and does not restate their detail — follow the links for evidence.

| Deliverable | Purpose |
|---|---|
| [OWASPMapping.md](OWASPMapping.md) | OWASP Top 10 (2021) mapping — 2 categories fail (A01, A06) |
| [DependencySecurityReport.md](DependencySecurityReport.md) | `npm audit`, outdated packages, license review |
| [ContainerSecurityReport.md](ContainerSecurityReport.md) | Docker image build/inspect review (scanner tooling unavailable — see gap below) |
| [SecretsManagementGuide.md](SecretsManagementGuide.md) | Secret inventory, rotation, least-privilege review |
| [SBOMReport.md](SBOMReport.md) | CycloneDX SBOM (573 components) + [`sbom.cyclonedx.json`](sbom.cyclonedx.json) |
| [PenetrationTestingChecklist.md](PenetrationTestingChecklist.md) | Structured test plan for an external pentest |
| [SecurityScorecard.md](SecurityScorecard.md) | Numeric score — 71.9/100, **MEDIUM** overall risk |

This batch builds on, and does not duplicate, the prior Batch 9 / WP-06C Phase 4 security-foundation work: [SecurityImplementationReport.md](SecurityImplementationReport.md), [SecurityCertificationChecklist.md](SecurityCertificationChecklist.md), [SecurityReadinessReview.md](SecurityReadinessReview.md), [SecurityRunbook.md](SecurityRunbook.md). That work built the JWT/RBAC/audit foundation; WP-05 is the gap-hunting pass on top of it, plus the ASVS/OWASP/dependency/container/SBOM/pentest artifacts that batch didn't produce.

---

## 01 — OWASP ASVS Level 2 review

| Area | Status |
|---|---|
| Authentication | PASS — JWT access+refresh, independently secreted, brute-force protected |
| Authorization | **GAP** — RBAC exists but is applied unevenly; 2 controllers have no auth guard at all |
| Session Management | PASS — rotation + replay detection + revocation |
| Access Control | **GAP** — see A01 in [OWASPMapping.md](OWASPMapping.md) |
| Input Validation | PASS — global `ValidationPipe` with `forbidNonWhitelisted` |
| Output Encoding | PASS — no raw HTML rendering in this API-only service; JSON responses only |
| Logging | PASS — comprehensive security audit trail (see [SecurityRunbook.md](SecurityRunbook.md)) |
| Cryptography | PASS — bcrypt-family password hashing, independently-secreted JWTs, TLS 1.2/1.3 at the edge |
| Configuration | **GAP** — Swagger UI unconditionally mounted; header tuning left at library defaults |
| API Security | PASS — rate limiting, request-size limits, DTO validation |
| Rate Limiting | PASS (config), **Not Applicable / Not verified live** (behavior under real load never tested) |
| Error Handling | PASS — `GlobalExceptionFilter` + structured validation errors |
| File Uploads | Not Applicable — no upload endpoint exists in `src/modules/**` today |

## 02 — OWASP Top 10 mapping

See [OWASPMapping.md](OWASPMapping.md) in full. Summary: **A01 (Broken Access Control) and A06 (Vulnerable Components) fail; A05 (Security Misconfiguration) has a medium gap; everything else passes conditionally.**

## 03 — HTTP security headers

| Header | Present? | Source |
|---|---|---|
| Content-Security-Policy | Yes (Helmet default) | `main.ts` — not tuned to this app's actual origins; generic `default-src 'self'` |
| Strict-Transport-Security | Yes | Both Helmet (app) and nginx (`max-age=63072000; includeSubDomains`) — nginx's is the one that reaches the client since it's the TLS-terminating edge |
| X-Content-Type-Options | Yes | Helmet + nginx (`nosniff`), redundant but harmless |
| Referrer-Policy | Yes | nginx (`strict-origin-when-cross-origin`) |
| Permissions-Policy | **No** | Neither Helmet's config nor nginx sets this explicitly — gap |
| Cross-Origin-Opener-Policy | Yes (Helmet default: `same-origin`) | app only, not set at nginx |
| Cross-Origin-Embedder-Policy | Helmet default is **unset** (Helmet 8 doesn't enable COEP by default) | gap if cross-origin isolation is ever needed |
| Cross-Origin-Resource-Policy | Yes (Helmet default: `same-origin`) | app only |
| X-Frame-Options / frame-ancestors | Yes | nginx sets `X-Frame-Options: DENY`; Helmet also sets `X-Frame-Options: SAMEORIGIN` by default — the two disagree in strictness (nginx's `DENY` wins at the edge since it's added `always` and is what actually reaches the client) |
| Report-Only CSP | No | Not configured — optional per spec, genuinely optional here since there's no browser-rendered frontend served by this service |

**Assessment:** the baseline is solid (Helmet + nginx double-covers the essentials) but nobody has *tuned* the CSP/Permissions-Policy for this specific app's needs — it's shipping framework/proxy defaults. Low urgency for a JSON-only API with no server-rendered HTML, but should be revisited if this service ever serves any HTML (e.g. Swagger UI, which it does — `/api/docs` is HTML and inherits whatever CSP is active).

## 04 — Dependency security

**0 critical / 3 high / 11 moderate** `npm audit` findings, only resolvable via a NestJS 10→11 major-version migration. Full detail: [DependencySecurityReport.md](DependencySecurityReport.md). License census: 100% permissive (MIT/Apache-2.0/ISC/BSD-family dominant), 0 copyleft.

## 05 — Container security

Manual image/Dockerfile review completed (non-root user, multi-stage build, no baked secrets, minimal Alpine base). **No CVE scanner (Trivy/Grype/Docker Scout) was run** — `docker scout` requires a login this environment lacks, and neither `trivy` nor `grype` is installed. This is the one WP-05 quality gate **not met** in this pass — see [ContainerSecurityReport.md](ContainerSecurityReport.md) §5 for the concrete CI job to add.

## 06 — Secret management

No secrets in git (verified, regression-tested). Fail-fast env-var pattern throughout. Gap: Mongo root credentials used for routine app DB access instead of a scoped user; no secrets-vault integration (accepted at Closed Beta scale). Full detail: [SecretsManagementGuide.md](SecretsManagementGuide.md).

## 07 — Supply chain

CycloneDX SBOM generated: 573 components, [`sbom.cyclonedx.json`](sbom.cyclonedx.json). All resolved from the public npm registry with lockfile-verified integrity hashes — no vendored/forked packages. No container-level (OS package) SBOM yet — same gap as §05, one CI job would close both. Full detail: [SBOMReport.md](SBOMReport.md).

## 08 — Penetration test checklist

Structured checklist covering all 12 required categories (auth bypass, authz bypass, IDOR, rate limiting, CSRF, JWT manipulation, replay, header tampering, fuzzing, file upload, session fixation, privilege escalation), pre-annotated with the two known-live findings (`MigrationController`, `AiRuntimeController`) so tester time isn't spent rediscovering what static review already found. Full detail: [PenetrationTestingChecklist.md](PenetrationTestingChecklist.md).

## 09 — Security scorecard

**71.9 / 100 — Overall Risk: MEDIUM.** Full breakdown and weighting rationale: [SecurityScorecard.md](SecurityScorecard.md).

---

## Consolidated remediation plan (sequenced by impact/effort)

| # | Action | Closes | Effort |
|---|---|---|---|
| 1 | Add `@UseGuards(JwtAuthGuard, PermissionGuard)` + `@RequirePermissions` to `MigrationController` and `AiRuntimeController` | A01 (OWASP), highest-weighted scorecard finding | Small — same pattern already used on 5 other controllers |
| 2 | Wire a Trivy (or equivalent) scan into CI against `Dockerfile.production` | Container-scan quality gate | Small — CI-only change, concrete job spec in [ContainerSecurityReport.md](ContainerSecurityReport.md) §5 |
| 3 | Triage the 3 High `npm audit` findings; schedule the NestJS 10→11 migration as its own tracked workstream | A06 (OWASP) | Medium — the migration itself is a real, test-suite-gated project; triage/documentation is small |
| 4 | Delete or clearly rename the legacy root-running `Dockerfile` | Container hygiene | Trivial |
| 5 | Gate `SwaggerModule.setup()` behind a non-production check, or put `/api/docs` behind auth | A05 (OWASP) | Small |
| 6 | Create a scoped MongoDB user for `ai-backend` instead of using root credentials | Secrets least-privilege | Small — infra/compose change |
| 7 | Confirm `ALLOW_SELF_ASSIGNED_ROLES` is unset in every real deployment; add it to deployment-checklist docs explicitly | A01 residual risk | Trivial — documentation |
| 8 | Commission the external penetration test using [PenetrationTestingChecklist.md](PenetrationTestingChecklist.md) | WP-05 exit criteria | External — schedule, not implement |

Items 1, 4, 5, 6, 7 are code/config changes on the order of hours, not days, and do not require the NestJS major-version migration to land first. Item 3's *migration itself* is the only genuinely large piece of work in this plan, and it's already isolated from the rest.

---

## Classification

**READY_FOR_OPERATIONS — conditional.**

Not `READY_FOR_CLOSED_BETA` yet: two fully unauthenticated controllers and an un-run container CVE scan are concrete, closeable gaps that should land before external users touch this service, not after. Everything else in this report — the auth/RBAC/audit foundation, secrets hygiene, license posture, SBOM — is in good shape and does not block Closed Beta.

**Recommended before `READY_FOR_CLOSED_BETA`:**
1. Remediation items #1 and #2 above (both small).
2. A triage decision (not necessarily a full fix) on the 3 High `npm audit` findings — "accepted risk with compensating controls, migration scheduled for `<date>`" is a legitimate closure if documented, per [DependencySecurityReport.md](DependencySecurityReport.md).

**Recommended before general availability (not blocking Closed Beta):**
- The NestJS 10→11 migration itself.
- Secrets-vault adoption.
- External penetration test execution against the checklist.
- MFA / password reset flow (pre-existing, documented gap from Batch 9).
