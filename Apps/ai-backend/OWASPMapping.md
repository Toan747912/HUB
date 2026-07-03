# WP-05 — OWASP Top 10 (2021) Mapping
**Scope:** `Apps/ai-backend` (NestJS/TypeScript, MongoDB, Redis, BullMQ)
**Date:** 2026-07-03
**Method:** static review of `src/**` (excluding `dist/`, `coverage/`, `node_modules/`), `main.ts` bootstrap, guard/module wiring, `nginx.conf`, Dockerfiles, and `npm audit` output. No dynamic/black-box testing was performed — see [PenetrationTestingChecklist.md](PenetrationTestingChecklist.md) for what a live test must additionally cover.

Builds on the existing auth/RBAC layer documented in [SecurityImplementationReport.md](SecurityImplementationReport.md) and [SecurityCertificationChecklist.md](SecurityCertificationChecklist.md) (Batch 9 / WP-06C Phase 4). This document is the gap-focused OWASP overlay, not a restatement of what already passed there.

---

## A01:2021 — Broken Access Control — **GAP (High)**

| Control | Status | Evidence |
|---|---|---|
| JWT/API-key authentication on business routes | Mostly PASS | `goal`, `roadmap`, `recommendation`, `learning-session`, `assessment` controllers all apply a guard that delegates to `JwtAuthGuard` (e.g. [roadmap.guard.ts](src/modules/roadmap/interface/guards/roadmap.guard.ts:9)) |
| RBAC via `@RequirePermissions` | PASS on `goal.controller.ts` only | Other guarded controllers apply `PermissionGuard` at the class level but most routes carry no `@RequirePermissions` decorator, so `PermissionGuard` fails open (`return true` when no metadata — [permission.guard.ts:25](src/infrastructure/security/rbac/permission.guard.ts#L25)) — authenticated-but-unscoped, not a broken-access-control bug by itself, but weaker than `goal.controller.ts`'s per-route enforcement |
| **`MigrationController` has no guard at all** | **FAIL** | [migration.controller.ts](src/modules/migration/interfaces/migration.controller.ts) — `POST /migration/run`, `/validate`, `/rollback` are reachable by **any unauthenticated caller**. `run`/`rollback` trigger real data migration/rollback pipelines. |
| **`AiRuntimeController` has no guard at all** | **FAIL** | [ai-runtime.controller.ts](src/modules/ai-runtime/ai-runtime.controller.ts) — `POST /ai/execute` is reachable by any unauthenticated caller (only a 10/min throttle, no identity check). Enables unauthenticated LLM-cost abuse and is the platform's most direct prompt-injection surface. |
| `POST /auth/register` role-escalation via self-registration | **RESOLVED since [SecurityReadinessReview.md](SecurityReadinessReview.md)** | [auth.service.ts:49-61](src/infrastructure/security/auth/auth.service.ts#L49-L61) — `isSelfAssignedRolesAllowed()` (default `false`, env-gated via `ALLOW_SELF_ASSIGNED_ROLES`) forces every self-registered account to `STUDENT` regardless of caller-supplied `roles`, and audits blocked elevation attempts as `REGISTRATION_ROLE_ESCALATION_BLOCKED`. This closes what was previously the highest-severity finding in the prior batch's readiness review — confirm `ALLOW_SELF_ASSIGNED_ROLES` is unset (or explicitly `false`) in the production environment. |
| IDOR on business resources | Not verified | Ownership checks (e.g. "is this goal mine") were not traced route-by-route in this static pass; flagged for the pentest checklist. |

**Verdict:** Fails A01 on the two unauthenticated controllers. The previously-flagged open self-registration gap has since been closed (see row above) — the remaining, live finding is narrower than it was at the last review: add `@UseGuards(JwtAuthGuard, PermissionGuard)` to `MigrationController` and `AiRuntimeController`, and verify the `ALLOW_SELF_ASSIGNED_ROLES` env var stays unset in production.

---

## A02:2021 — Cryptographic Failures — **PASS (Conditional)**

| Control | Status | Evidence |
|---|---|---|
| Password hashing | PASS | `bcryptjs` (pure-JS bcrypt), salted, policy-enforced — [SecurityImplementationReport.md](SecurityImplementationReport.md) |
| JWT signing secrets | PASS | `JWT_SECRET` / `REFRESH_SECRET` independently configured, fail-fast if unset, grep-checked for no hardcoded literals ([security.config.spec.ts](src/infrastructure/security/secrets/__tests__/security.config.spec.ts)) |
| API keys at rest | PASS | Only a SHA-256 hash is stored ([api-key.schema.ts](src/infrastructure/security/api-keys/api-key.schema.ts)); raw key returned exactly once at issuance |
| Transport encryption | PASS (edge), Conditional (origin) | `nginx.conf` terminates TLS 1.2/1.3 with a restricted cipher suite and redirects HTTP→HTTPS. Traffic from nginx to `ai-backend`/`mongo`/`redis` is plaintext inside the Docker network — acceptable only if that network is not shared with untrusted workloads. |
| Secrets in transit/storage | PASS | No secrets committed to git (verified below); all read from env vars |

**Verdict:** Passes for data actually handled today. No field-level encryption exists for stored user data, but nothing in scope currently classifies as needing it beyond password hashes (already hashed) and refresh tokens (already opaque, DB-side revocable).

---

## A03:2021 — Injection — **PASS (Conditional)**

| Control | Status | Evidence |
|---|---|---|
| NoSQL injection (Mongo) | PASS | Mongoose schemas + typed repositories throughout; no raw `$where`/string-built queries observed in the reviewed `src/infrastructure` and `src/modules` repositories |
| Input validation | PASS | Global `ValidationPipe({whitelist: true, forbidNonWhitelisted: true, transform: true})` in [main.ts:29-48](src/main.ts#L29-L48) — unknown fields are rejected, not silently dropped |
| DTO coverage on the two unguarded controllers | PASS (validation), FAIL (auth — see A01) | `RunMigrationDto`/`ValidateMigrationDto`/`RollbackMigrationDto`/`AiExecuteDto` all go through the same global `ValidationPipe`, so injection is mitigated even though authentication is not |
| Prototype pollution (dependency-level) | **FAIL — see A06** | `lodash` (`_.template`, `_.unset`/`_.omit`) and `js-yaml` (`<<` merge key) advisories via `@nestjs/swagger`'s dependency chain — see [DependencySecurityReport.md](DependencySecurityReport.md) |
| Command/OS injection | PASS | No `child_process`/`exec` usage found outside test infra and `node_modules` |

**Verdict:** Application-level injection defenses are solid. The residual injection risk is entirely at the dependency layer (A06 overlap).

---

## A04:2021 — Insecure Design — **PASS (Conditional)**

| Control | Status | Notes |
|---|---|---|
| Refresh-token rotation with family-wide replay revocation | PASS | Textbook RTR compromise-detection design — see [SecurityImplementationReport.md § Auth Flows](SecurityImplementationReport.md) |
| Brute-force protection | PASS | Redis-backed, 5 failures/15min, degrades to global throttler only if Redis unconfigured — documented tradeoff, not a silent failure |
| Open self-registration with caller-chosen roles | **FAIL — see A01** | This is a design gap, not an implementation bug: no invite/admin-provisioning flow exists yet |
| No MFA / no password reset flow | Accepted gap | Explicitly out of scope for the "Security Foundation" batch; reasonable to defer past Closed Beta but must be tracked |
| Threat modeling artifact | Missing | No STRIDE/attack-tree document exists for the auth or AI-runtime surfaces; recommended before external pentest (see [PenetrationTestingChecklist.md](PenetrationTestingChecklist.md)) |

---

## A05:2021 — Security Misconfiguration — **GAP (Medium)**

| Control | Status | Evidence |
|---|---|---|
| Helmet baseline | PASS | `app.use(helmet())` in [main.ts:21](src/main.ts#L21) — default CSP, `X-Content-Type-Options`, `X-DNS-Prefetch-Control`, `X-Frame-Options`, COOP, CORP all applied with library defaults |
| Header tuning | **GAP** | CSP/COOP/CORP/Permissions-Policy are all left at Helmet's generic defaults — never customized for this app's actual origins/frame needs. See [HTTP Security Headers](#appendix-http-security-headers-detail-see-securityhardeningreportmd) note below. |
| CORS | PASS | Closed-by-default (`getCorsOrigin()` returns `[]` unless `CORS_ORIGIN` is set) — secure default |
| Request body size limit | PASS | `express.json({limit: getRequestBodyLimit()})`, default `1mb` |
| Swagger/OpenAPI exposure | **GAP** | `SwaggerModule.setup('api/docs', ...)` is always mounted, including in a production `NODE_ENV` — no env-gate. Exposes full route/DTO shape to anyone who can reach the service. |
| Default error handling | PASS | `GlobalExceptionFilter` + typed `exceptionFactory` on `ValidationPipe` avoid leaking stack traces in the validation-error path (stack-trace behavior of the global filter itself not independently re-verified in this pass) |
| Docker image hygiene | PASS | Multi-stage Alpine build, non-root user, no dev deps in the final `runtime` stage — see [ContainerSecurityReport.md](ContainerSecurityReport.md). The single-stage `Dockerfile` (not `.production`) still runs `npm install` (not `npm ci`) as root — should be retired if unused. |

---

## A06:2021 — Vulnerable and Outdated Components — **FAIL (High)**

`npm audit` (2026-07-03, `Apps/ai-backend`): **14 advisories — 0 critical, 3 high, 11 moderate, 0 low**, all only fixable via a semver-major bump (`@nestjs/*` v10→v11). Full detail, package-by-package, in [DependencySecurityReport.md](DependencySecurityReport.md).

Highest-impact items:
- `lodash` (via `@nestjs/swagger`) — code injection via `_.template` (CVSS 8.1, High)
- `multer` (via `@nestjs/platform-express`) — multiple DoS advisories (High)
- `@nestjs/core` — output-neutralization/injection advisory, CVSS 6.1 (Moderate, but directly in the request path)

**Verdict:** Fails A06 by npm audit's own threshold. This is also why the existing `.github/workflows/dependency-audit.yml` `npm audit --audit-level=high` step would currently **fail CI** if run against this branch — it hasn't regressed, it's the first time this WP has actually run the check and looked at the result.

---

## A07:2021 — Identification and Authentication Failures — **PASS (Conditional)**

| Control | Status | Evidence |
|---|---|---|
| Token expiry | PASS | Access 15m default, refresh 7d default, both configurable |
| Session/token invalidation on logout | PASS | `AuthService.logout()` revokes the entire refresh-token family |
| Credential stuffing / brute force | PASS | See A04 |
| Weak password acceptance | PASS | Enforced policy: 10+ chars, upper/lower/digit/symbol |
| Registration abuse | RESOLVED — see A01 | Role-escalation via self-registration is closed; cross-referenced rather than duplicated |

---

## A08:2021 — Software and Data Integrity Failures — **PASS (Conditional)**

| Control | Status | Evidence |
|---|---|---|
| Dependency install reproducibility | PASS | `package-lock.json` committed, `npm ci` used in `Dockerfile.production` and `dependency-audit.yml` |
| CI provenance | Partial | No artifact signing / SLSA provenance step observed in `.github/workflows/*` — acceptable for current maturity, worth a follow-on item, not a blocker |
| Insecure deserialization | PASS | No `eval`/`Function`/unsafe `JSON.parse` of untrusted structured data beyond standard `class-validator`-guarded DTO bodies |

---

## A09:2021 — Security Logging and Monitoring Failures — **PASS**

Extensive coverage already exists and was verified in Batch 9: `LOGIN_SUCCESS/FAILED`, `LOGOUT`, `TOKEN_REFRESHED`, `REFRESH_TOKEN_REUSE_DETECTED`, `PERMISSION_DENIED`/`PERMISSION_GRANTED` all recorded to `audit_events` with `traceId`/`userId` — see [SecurityRunbook.md](SecurityRunbook.md). Gap: `MigrationController` and `AiRuntimeController` requests are not attributable to a user (no auth = no `userId` to log), which compounds the A01 finding operationally — an abused `/ai/execute` or `/migration/rollback` call cannot be traced back to a caller.

---

## A10:2021 — Server-Side Request Forgery (SSRF) — **Not Applicable (currently)**

No code path in `src/**` accepts a caller-supplied URL and performs an outbound fetch against it. `AiRuntimeService`'s LLM client target is configured server-side, not caller-supplied (confirm this remains true if/when a real external LLM provider integration replaces `mock-llm-client.service.ts`). Re-check this category the moment any user-facing "fetch this URL" feature is added.

---

## Summary

| Category | Verdict |
|---|---|
| A01 Broken Access Control | **FAIL** — 2 fully unauthenticated controllers (self-registration role escalation already resolved) |
| A02 Cryptographic Failures | PASS (conditional) |
| A03 Injection | PASS (conditional) |
| A04 Insecure Design | PASS (conditional) — registration design gap tracked under A01 |
| A05 Security Misconfiguration | GAP (Medium) — header tuning, Swagger exposure |
| A06 Vulnerable Components | **FAIL** — 3 high / 11 moderate npm advisories |
| A07 Auth Failures | PASS (conditional) |
| A08 Software/Data Integrity | PASS (conditional) |
| A09 Logging & Monitoring | PASS |
| A10 SSRF | N/A |

Two categories fail outright (A01, A06); both have a clear, scoped, low-effort remediation (add guards to two controllers + close registration; bump `@nestjs/*` to v11 and re-test). See [SecurityHardeningReport.md](SecurityHardeningReport.md) for the consolidated remediation plan and [SecurityScorecard.md](SecurityScorecard.md) for the numeric score this mapping feeds into.

---

### Appendix: HTTP security headers (detail — see SecurityHardeningReport.md)

This document intentionally keeps header detail brief; the full per-header table (present/absent/source: Helmet vs nginx) lives in `SecurityHardeningReport.md` §03 to avoid duplicating it here.
