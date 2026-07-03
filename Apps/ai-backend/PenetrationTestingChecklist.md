# WP-05 — Penetration Testing Checklist
**Scope:** `Apps/ai-backend`
**Date:** 2026-07-03
**Purpose:** structured checklist for the external penetration test recommended by every prior security document ([SecurityCertificationChecklist.md](SecurityCertificationChecklist.md) §11.1, [SecurityReadinessReview.md](SecurityReadinessReview.md)). This is a **test plan**, not a test report — nothing below has been executed against a live/staging environment; it's what the external tester (or an internal red-team pass) should exercise, annotated with what this WP-05 static review already knows or suspects, to focus tester time on the highest-value targets first.

---

## Priority targets (start here — known-likely findings from static review)

1. **`POST /migration/run`, `/migration/validate`, `/migration/rollback`** — confirmed unauthenticated at the code level ([OWASPMapping.md § A01](OWASPMapping.md)). Verify live: can an anonymous request trigger a real migration/rollback against the target environment's database?
2. **`POST /ai/execute`** — confirmed unauthenticated. Verify live: cost-abuse potential (unlimited unauthenticated LLM calls beyond the 10/min throttle), and prompt-injection reachability against whatever LLM backend is wired in for the tested environment.
3. **`POST /auth/register`** — confirmed unauthenticated by design (self-service signup), but role-escalation is closed. Verify live: attempt `roles: ["ADMIN"]` in the request body and confirm the resulting account is `STUDENT` only, and that a `REGISTRATION_ROLE_ESCALATION_BLOCKED` audit event is recorded.

---

## 1. Authentication bypass

- [ ] Access protected routes (`/goal`, `/roadmap`, `/recommendation`, `/learning-sessions`, `/assessment`) with no `Authorization` header — expect 401.
- [ ] Access with a malformed/truncated JWT — expect 401, not a 500.
- [ ] Access with a JWT signed with a guessed/empty/`none`-algorithm signature — expect rejection (verify `jsonwebtoken`'s `algorithms` allowlist is enforced, not left to the token's own `alg` header).
- [ ] Access `/migration/*` and `/ai/execute` with no auth — **expect this to currently succeed** (known gap, see Priority Targets above); confirm and record as a finding rather than assuming it's already known-and-accepted by whoever reads the pentest report.
- [ ] Access `/health`, `/readiness`, `/metrics` with no auth — expect success (intentional, per [SecurityRunbook.md](SecurityRunbook.md)); confirm no sensitive data leaks through `/metrics` labels.

## 2. Authorization bypass (RBAC)

- [ ] Authenticate as `STUDENT`, attempt `Goal.Write`/`Goal.Delete`/`Goal.Archive` routes — expect 403.
- [ ] Authenticate as `TEACHER`, attempt any `ADMIN`-only capability (if one exists beyond `Goal.*`) — expect 403.
- [ ] For controllers using `PermissionGuard` without a per-route `@RequirePermissions` decorator (roadmap/recommendation/learning-session/assessment — see [OWASPMapping.md § A01](OWASPMapping.md)), confirm whether any authenticated user of any role can reach every route — this is expected behavior today (guard fails open absent metadata) but should be explicitly verified and flagged as a scope decision, not silently assumed safe.
- [ ] Confirm a revoked/de-provisioned user's still-valid (unexpired) access token cannot perform write operations after role removal, within the documented TTL window (up to 15 min) — this is a *known, accepted* limitation, verify it matches documentation rather than being worse in practice.

## 3. IDOR (Insecure Direct Object Reference)

- [ ] As User A, attempt to read/modify/delete a Goal/Roadmap/Assessment/LearningSession belonging to User B by guessing or enumerating IDs.
- [ ] Check whether resource IDs are sequential/guessable (Mongo ObjectIds are not sequential, but confirm no auto-increment IDs leaked anywhere in DTOs).
- [ ] Confirm ownership checks exist in the application/domain layer (not verified in this static pass — this repo's guards enforce *role*, not *resource ownership*; ownership enforcement, if any, lives deeper in the application layer and needs its own trace).

## 4. Rate limiting

- [ ] `POST /auth/login` — confirm the documented 5/min throttle actually triggers a 429 under real concurrent load (flagged as never load-tested in [SecurityReadinessReview.md](SecurityReadinessReview.md) — still true).
- [ ] Global routes — confirm the 30/min default throttler engages.
- [ ] `POST /ai/execute` — confirm the 10/min throttle engages, and specifically test whether it's keyed per-IP or globally (if per-IP, test bypass via IP rotation/proxy — relevant given this route has no auth to fall back on as a second layer).
- [ ] Confirm throttler responses don't leak internal state (e.g. exact remaining-quota values that aid an attacker in timing a burst).

## 5. CSRF

- [ ] This is a stateless bearer-token API (no cookie-based session) — CSRF is low-relevance for the JSON API surface itself. **Do** check whether any route accepts credentials via cookies (none identified in this static review) — if `credentials: true` in CORS ([main.ts:26](src/main.ts#L26)) is ever paired with cookie-based auth in the future, CSRF protections would need adding at that point. Confirm current behavior matches "bearer-token-only, no cookie auth."

## 6. JWT manipulation

- [ ] Alter the `alg` header to `none` — expect rejection.
- [ ] Alter the `roles`/`sub` claims and re-sign with a guessed weak secret — expect rejection assuming `JWT_SECRET` is a strong random value in the tested environment (verify the deployed secret's entropy, not just the code path).
- [ ] Present an expired access token — expect 401 (`TokenExpiredError`, per [jwt-auth.guard.spec.ts](src/infrastructure/security/__tests__/jwt-auth.guard.spec.ts)).
- [ ] Present an access token where the signature was produced with `REFRESH_SECRET` instead of `JWT_SECRET` (cross-secret confusion) — expect rejection (independently keyed, per [SecurityCertificationChecklist.md § 1.3](SecurityCertificationChecklist.md)).

## 7. Replay attack

- [ ] Capture a valid refresh token, use it once (rotate successfully), then replay the **original** token — expect 401 + entire token family revoked (`REFRESH_TOKEN_REUSE_DETECTED`), confirm this is observable live, not just in unit tests.
- [ ] After a replay is detected, confirm the *newer*, not-yet-used successor token is also rejected (family-wide revocation, not just the replayed token itself).
- [ ] Capture and replay an `X-API-Key` header value — expect it to work indefinitely until explicitly revoked (no built-in expiry on API keys — confirm this is the intended design, not a gap, before treating it as a finding).

## 8. Header tampering

- [ ] Strip/spoof `X-Forwarded-For`/`X-Real-IP` at the nginx boundary — confirm rate-limiting/brute-force keying isn't trivially bypassed by spoofing client IP (relevant if `ThrottlerModule`/`BruteForceService` key off request IP — verify which header they actually trust).
- [ ] Spoof `x-trace-id` on `/migration/*` — low severity, but confirm arbitrary trace IDs can't be used to pollute or spoof audit-trail correlation.
- [ ] Confirm Helmet's default headers (CSP, X-Content-Type-Options, etc.) are actually present on live HTTP responses, not just configured in code — verify via `curl -I` against the deployed environment, and cross-check against nginx's own `add_header` set (see [SecurityHardeningReport.md](SecurityHardeningReport.md) §03 for the expected header inventory).

## 9. Input fuzzing

- [ ] Fuzz all DTO fields (`register`, `login`, `refresh`, Goal/Roadmap/Assessment create/update bodies) with oversized strings, null bytes, Unicode edge cases, and deeply nested objects — `ValidationPipe`'s `forbidNonWhitelisted` should reject unknown fields; confirm it also handles type-confusion (e.g. array where string expected) gracefully with a 400, not a 500.
- [ ] Fuzz `AiExecuteDto` specifically with prompt-injection payloads — this is the route with no authentication *and* the most direct exposure to an LLM backend; treat it as the single highest-value fuzzing target in this checklist.
- [ ] Oversized request bodies beyond `REQUEST_BODY_LIMIT` (default 1mb) — expect a clean 413, not a crash.

## 10. File upload

- [ ] Not applicable today — no file-upload endpoint was found in `src/modules/**` during this static review. **However**, `multer` and `file-type` are both present in the dependency tree (transitively, via `@nestjs/platform-express`/`@nestjs/common`) and both carry open advisories (see [DependencySecurityReport.md](DependencySecurityReport.md)) — if a file-upload feature is added later, re-run this section and prioritize patching those two packages first.

## 11. Session fixation

- [ ] Confirm a pre-issued/attacker-supplied refresh token cannot be "adopted" by a victim's login (i.e. login always issues a fresh `familyId`, never reuses a client-supplied token identifier) — matches the documented design ([SecurityImplementationReport.md § Auth Flows](SecurityImplementationReport.md)), verify live.

## 12. Privilege escalation

- [ ] Attempt the `ALLOW_SELF_ASSIGNED_ROLES` bypass path — confirm the env var is unset/`false` in the tested environment and that no request-level override exists (e.g. a header or query param that flips it) — static review found none, verify live.
- [ ] Attempt to reach an `ADMIN`-only action (if any exists beyond role assignment) as a `TEACHER` by manipulating the JWT's `roles` claim without re-signing (expect signature validation to reject this — overlaps with §6).
- [ ] Attempt privilege escalation via the unauthenticated `/migration/*` routes as a path to indirectly mutate data an authenticated `STUDENT`/`TEACHER` shouldn't be able to touch — this is the most concrete escalation path available today given the §Priority Targets findings.

---

## Pre-test prerequisites (must be true before commissioning an external test)

- [ ] A dedicated staging environment exists that mirrors production configuration (secrets, CORS origin, rate limits) without touching real user data.
- [ ] `MigrationController` and `AiRuntimeController` guard gap is either fixed or explicitly in-scope-and-acknowledged for the tester (don't let a known gap "surprise" the test report — decide whether to fix first or test the gap intentionally).
- [ ] Rules of engagement define acceptable load for rate-limit/DoS-adjacent tests (§4, §9) so the test itself doesn't cause an outage.
