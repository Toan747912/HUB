# Security Foundation — Readiness Review
**Batch:** 9 — Security Foundation
**Date:** 2026-07-02
**Input Classification:** READY_FOR_PRODUCTION_OBSERVABILITY (Conditional)

---

## Summary

Batch 9 adds a complete security layer to `Apps/ai-backend`: JWT authentication with
independently-secreted access/refresh tokens, rotation with replay-detection, RBAC
across 4 roles and 5 Goal permissions, API hardening (Helmet, CORS, rate limiting,
API keys, body-size limits), bcrypt-family password hashing with an enforced policy,
Redis-backed brute-force protection, and a Mongo-backed security audit trail — all
achieved with **zero changes to Domain, Application, aggregate rules, or
controller/repository contracts.**

57 of 61 certification checks are green under available test infrastructure. The
remaining 4 require external processes this sandbox cannot perform (a penetration
test, a production user-provisioning decision, secrets-vault integration, and live
load-testing of rate limits) — none require further code changes to close, only
deployment/process decisions.

---

## What Was Verified

- **Type safety:** `tsc -p tsconfig.build.json --noEmit` — 0 errors.
- **Build:** full `tsc` build succeeds, `dist/` regenerates cleanly.
- **Unit/integration tests:** 198/198 passing across 39 suites — 121 pre-existing
  (Batches 6–8, unmodified) + 77 new for this batch.
- **JWT correctness:** generation, validation, expiry, and signature-mismatch
  detection all independently verified for both access and refresh token types.
- **Refresh rotation + replay detection:** verified that consuming a refresh token
  makes it permanently unusable, that a replay of a consumed token revokes the entire
  rotation family (including tokens not yet presented), and that this is recorded as a
  distinct, auditable security event.
- **RBAC:** every role×permission combination from `role-permissions.map.ts` verified;
  a live smoke test confirmed a `STUDENT` role receives HTTP 403 attempting a
  `Goal.Write`-guarded route, and the denial is recorded in the audit trail with the
  required permission and the caller's actual roles.
- **End-to-end smoke test:** the full HTTP stack — register → login → RBAC-denied
  request (403) → unauthenticated request (401) → RBAC-approved request as `ADMIN`
  (201) → refresh rotation (200) → replay detection (401,
  `REFRESH_TOKEN_REUSE_DETECTED`) → wrong-password login (401) — all verified against
  a running instance with an in-memory MongoDB.
- **Domain/Application/contract boundary:** zero diffs to `domain/`, zero diffs to
  `application/`, zero diffs to `IGoalRepository`/`IEventPublisher`, zero diffs to
  route paths/DTOs/response shapes on `goal.controller.ts` (only guard/decorator
  metadata was added). All 121 pre-existing tests from Batches 6–8 continue to pass
  unmodified.
- **No hardcoded credentials:** a grep-based test asserts no literal secret-shaped
  strings exist in `security.config.ts` or `main.ts`; both `JWT_SECRET` and
  `REFRESH_SECRET` fail the app at bootstrap if unset, matching the established
  `MONGODB_URI` fail-fast precedent from Batch 6.

## What Was NOT Verified (and why)

1. **No external penetration test.** All security behavior is verified by this
   codebase's own unit/integration tests and functional smoke tests — there was no
   independent red-team exercise. This is standard practice to recommend before any
   production exposure of a new auth system, regardless of how thorough internal
   testing is.
2. **`POST /auth/register` is unrestricted.** There's no existing user-provisioning
   flow to build on (no prior admin/invite system existed anywhere in the codebase),
   so a minimal open registration endpoint was added and explicitly documented as
   dev/seed-oriented. This is a **known, intentional, documented gap** — not an
   oversight — and must be addressed (removed, role-restricted, or invite-gated)
   before production.
3. **No secrets-vault integration.** Consistent with every prior batch (`MONGODB_URI`,
   `REDIS_PASSWORD`), secrets are plain environment variables. This matches the
   codebase's existing conventions rather than introducing a new pattern
   inconsistently; adopting a vault is a follow-on infrastructure decision, not a
   Batch 9 gap specifically.
4. **Rate-limit behavior under real load is unverified.** `@nestjs/throttler`'s
   correctness is upstream-tested; this batch verified the *configuration* (login route
   carries a tighter override) but did not load-test actual throttling behavior under
   concurrent traffic in this sandbox.

None of these require further implementation work in this codebase — they are either
external processes (pentest) or deployment/product decisions (registration policy,
vault adoption) that don't change based on more code being written here.

---

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Open self-registration (`POST /auth/register`) | **High** | Must be resolved before production — see Known Gap #2 above. This is the single most important item blocking production readiness. |
| No MFA/2FA | Medium | Out of scope for "Security Foundation" batch; reasonable next-phase addition |
| No password reset flow | Medium | Same — a follow-on feature, not a regression from this batch's baseline (there was no auth system before, so no reset flow existed either) |
| Role changes don't retroactively revoke already-issued access tokens | Low–Medium | Documented in the Runbook; mitigated by the short (15m) access token TTL and the ability to force-revoke refresh token families for immediate effect |
| API key usage isn't separately audited (only JWT auth events are) | Low | Documented gap in the Runbook; straightforward one-line addition to `JwtAuthGuard`'s API-key branch if needed |
| `AuditModule` promoted to `@Global()` — widens its blast radius slightly | Low | Necessary for `PermissionGuard`'s DI resolution (documented in Implementation Report); `AuditLogService` was already designed as a safe, side-effect-free cross-cutting concern in Batch 8 |
| bcryptjs (pure JS) is slower than native bcrypt under high load | Low | Acceptable tradeoff for this environment (avoids native compilation risk); can be swapped to `bcrypt` later with zero API changes (same method signatures) if a build environment with confirmed MSVC/node-gyp tooling is available |

---

## Classification

**READY_FOR_SECURE_PLATFORM** — conditional on resolving the open self-registration
gap (§ Known Gaps #2) before any production deployment, and completing an external
penetration test per standard practice for a newly-introduced authentication system.
The code, contracts, and verified behavior are complete and correct for everything
testable within this sandbox; what remains is a product/process decision on user
provisioning and an external security validation step, not further implementation.

Recommended next steps before `READY_FOR_PRODUCT_MODULES`:
1. Decide and implement the production user-provisioning story (remove/restrict/gate
   `POST /auth/register`).
2. Commission an external penetration test of the auth/RBAC layer.
3. Decide whether `/metrics` needs auth for this deployment's threat model (currently
   intentionally open, per Batch 8's precedent and this batch's Runbook).
4. If deploying with high login volume, load-test the `/auth/login` rate limit
   threshold (currently 5/min) and adjust if it's too aggressive/lenient for real usage
   patterns.
