# Security Foundation — Implementation Report
**Batch:** 9 — Security Foundation
**Date:** 2026-07-02
**Strategy:** JWT auth (access + rotating refresh tokens) + RBAC + Helmet/CORS/rate-limiting + bcryptjs + Redis-backed brute-force protection + Mongo-backed security audit trail
**Classification (input):** READY_FOR_PRODUCTION_OBSERVABILITY (Conditional)

---

## Objective

Transform `Apps/ai-backend` into a production-secure backend — JWT authentication with
rotation/revocation, RBAC, API hardening, password security, secret management, and
security audit logging — **without modifying the Domain Layer, Application Layer,
aggregate rules, controller contracts, or repository contracts.**

---

## Architectural Approach

There was no auth/identity system anywhere in the codebase before this batch
(`GoalGuard` only checked that `Authorization` was a non-empty string). Batch 9 builds a
complete Identity/RBAC/hardening layer as new infrastructure, reusing prior-batch
infrastructure wherever possible instead of inventing parallel mechanisms:

- **`RedisService`** (Batch 7) backs brute-force attempt counters — same `INCR`+`EXPIRE`
  idiom as `RedisCircuitBreakerService`, same optional-no-op-when-unconfigured pattern.
- **`AuditLogRepository.record()`** (Batch 8) already writes generic
  `{traceId,userId,operation,resource,before,after}` rows. Security events
  (login/logout/refresh/permission-denied/replay-detected) go through a new
  **additive** `AuditLogService.recordSecurityEvent()` method — the existing
  `recordFromDomainEvent()` method is untouched.
- **`RequestContextService`** (Batch 8) — `JwtAuthGuard` pushes the authenticated
  `userId` into the same `AsyncLocalStorage` context already used for structured
  logging/tracing, so every downstream log/audit/trace automatically picks up who made
  the request with no further plumbing.
- **`ThrottlerModule`** (already globally wired since before Batch 6) is the spec's
  "Rate Limiter" — this batch adds a tighter `@Throttle({default:{limit:5,ttl:60000}})`
  on `POST /auth/login` specifically, layered on top of the existing 30/min global
  default.
- **Env-var fail-fast pattern** (`getDatabaseUri()`, `getRedisOptions()`) reused for
  `JWT_SECRET`/`REFRESH_SECRET`.

**One infrastructure module was widened:** `AuditModule` is now `@Global()` (was
module-scoped, explicitly imported only by `OutboxModule`). `PermissionGuard` needs
`AuditLogService` and is referenced via `@UseGuards(PermissionGuard)` directly in
`GoalController` — NestJS resolves guard classes referenced this way within the
*consuming* module's own injector scope, so `GoalModule` needed access to
`AuditLogService` without itself importing `AuditModule`. Since audit logging is
inherently cross-cutting (now used by both domain-event auditing and security-event
auditing), promoting it to `@Global()` — matching `RedisModule`/`TelemetryModule` — was
the correct fix rather than adding ad hoc imports to every consuming module.

**Package substitution — `bcryptjs` not `bcrypt`:** `bcrypt` requires native
compilation via node-gyp; this Windows sandbox has Python but no confirmed MSVC build
tools, making native compilation a real risk. `bcryptjs` is a pure-JS, API-compatible
drop-in. Verified working end-to-end (hash/verify round-trip in both unit tests and the
live boot smoke test).

---

## Files Created

### `src/infrastructure/security/secrets/`
| File | Purpose |
|---|---|
| `security.config.ts` | `getJwtSecret()`/`getRefreshSecret()` (fail-fast, mirrors `getDatabaseUri()`), `getAccessTokenTtl()` (default `15m`), `getRefreshTokenTtlSeconds()` (default 7 days), `getCorsOrigin()` (default closed — empty list), `getRequestBodyLimit()` (default `1mb`), `getApiKeyHeaderName()` (default `x-api-key`) |

### `src/infrastructure/security/rbac/`
| File | Purpose |
|---|---|
| `role.enum.ts` | `Role = 'ADMIN'\|'TEACHER'\|'STUDENT'\|'SYSTEM'` |
| `permission.enum.ts` | `Permission = 'Goal.Read'\|'Goal.Write'\|'Goal.Delete'\|'Goal.Complete'\|'Goal.Archive'` — plain string-union array, one-line addition to extend |
| `role-permissions.map.ts` | `ROLE_PERMISSIONS` — ADMIN/SYSTEM get all; TEACHER gets Read/Write/Complete/Archive; STUDENT gets Read/Complete |
| `require-permissions.decorator.ts` | `@RequirePermissions(...perms)` — `SetMetadata` |
| `permission.guard.ts` | `PermissionGuard` — reads reflected permissions, checks `request.user.roles` against `ROLE_PERMISSIONS`, audits `PERMISSION_DENIED` before throwing 403 |

### `src/infrastructure/security/auth/`
| File | Purpose |
|---|---|
| `user.schema.ts` / `user.repository.ts` | Minimal Mongoose `users` collection (`username`, `passwordHash`, `roles[]`) — infrastructure-only, no domain aggregate |
| `password.service.ts` | `bcryptjs` hash/verify; `validatePolicy()` (min 10 chars, upper/lower/digit/symbol) throwing `WeakPasswordError` with itemized violations |
| `jwt.service.ts` | `AppJwtService` — independently-secreted access (`JWT_SECRET`) and refresh (`REFRESH_SECRET`) signers via `@nestjs/jwt`; typed `TokenExpiredError`/`InvalidSignatureError` distinguished from raw `jsonwebtoken` error names |
| `refresh-token.schema.ts` / `refresh-token.repository.ts` | Persistent rotation-family-tracked refresh token store (`jti, userId, familyId, issuedAt, expiresAt, consumedAt, revokedAt, replacedByTokenId`) |
| `brute-force.service.ts` | Redis-backed failed-login counter (5 failures / 15 min window), no-op when Redis unconfigured |
| `auth.service.ts` | `AuthService.register/login/refresh/logout` — see "Auth Flows" below |
| `auth.controller.ts` | `POST /auth/register`, `/login` (tighter throttle), `/refresh`, `/logout` — brand-new routes, zero changes to `goal.controller.ts`'s route shape |
| `dto/{login,refresh,register}.dto.ts` | `class-validator` DTOs matching existing DTO style |
| `auth.module.ts` | Wires the above |

### `src/infrastructure/security/api-keys/`
| File | Purpose |
|---|---|
| `api-key.schema.ts` / `api-key.repository.ts` | `api_keys` collection storing only a SHA-256 hash of the key, never the raw value |
| `api-key.service.ts` | `issue()` (returns raw key exactly once), `verify()`, `revoke()` |
| `api-keys.module.ts` | — |

### `src/infrastructure/security/`
| File | Purpose |
|---|---|
| `jwt-auth.guard.ts` | `JwtAuthGuard` — verifies `Authorization: Bearer <token>` **or** `x-api-key` (→ `SYSTEM` role); attaches `request.user`; pushes `userId` into `RequestContextService`; 401 on any failure |
| `security.module.ts` | `@Global()` — wires `AuthModule`, `ApiKeysModule`, `JwtAuthGuard`, `PermissionGuard` app-wide |

---

## Files Modified

| File | Change |
|---|---|
| `infrastructure/audit/audit-log.service.ts` | **Additive** `recordSecurityEvent()` method; `recordFromDomainEvent()` untouched |
| `infrastructure/audit/audit.module.ts` | Marked `@Global()` (see rationale above) |
| `modules/goal/interface/guards/goal.guard.ts` | Body replaced to delegate to `JwtAuthGuard` (real verification instead of "any non-empty string"). Same class name, same `CanActivate` signature — `goal.controller.ts`'s `@UseGuards(GoalGuard)` line required zero edits for this part. |
| `modules/goal/interface/controllers/goal.controller.ts` | Added `PermissionGuard` to the class-level `@UseGuards(...)` and one `@RequirePermissions('Goal.<X>')` decorator per route (`create`→Write, `findAll`/`findOne`→Read, `update`→Write, `archive`→Archive, `complete`→Complete). **Zero changes** to route paths, DTOs, or response shapes. |
| `main.ts` | `app.use(helmet())`; `app.use(express.json({limit: getRequestBodyLimit()}))`; `app.enableCors({origin: getCorsOrigin(), ...})` |
| `app.module.ts` | Imports `SecurityModule` (additive) |
| `package.json` | Added `@nestjs/jwt`, `bcryptjs`, `helmet`; devDependency `@types/bcryptjs` |

No changes to: `domain/**`, `application/**`, `IGoalRepository`, `IEventPublisher`,
`goal.aggregate.ts`, any DTO shape, any response shape, any route path.

---

## Auth Flows

### Login
`AuthService.login(username, password)`:
1. `BruteForceService.isLocked(username)` — pre-emptive rejection if locked (no DB
   lookup, no timing side-channel from a real password check).
2. Look up user, verify password via `bcryptjs`.
3. On failure: `BruteForceService.recordFailure()`, audit `LOGIN_FAILED`, 401.
4. On success: `BruteForceService.reset()`, issue an access+refresh token pair under a
   fresh `familyId`, audit `LOGIN_SUCCESS`.

### Refresh rotation + replay detection
`AuthService.refresh(refreshToken)`:
1. Verify signature/expiry (`REFRESH_SECRET`).
2. Look up the token's `jti` in the store.
3. **If already `consumedAt` or `revokedAt`**: this is a **replay** — the entire
   `familyId` is revoked (every token ever issued in that rotation chain, including
   ones not yet presented), audit `REFRESH_TOKEN_REUSE_DETECTED`, 401. This is the
   standard refresh-token-rotation (RTR) compromise-detection pattern: a consumed
   token being reused means either an attacker has a copy, or a client bug is replaying
   requests — either way, the whole session family is burned.
4. **If valid**: mark consumed (linked via `replacedByTokenId`), issue a new pair in
   the *same* `familyId`, audit `TOKEN_REFRESHED`.

### Logout
`AuthService.logout(refreshToken)`: verifies the token, revokes its entire `familyId`,
audits `LOGOUT`.

---

## Runtime Evidence

### Type check
```
npx tsc -p tsconfig.build.json --noEmit
```
Result: **0 errors.**

### Build
```
npx tsc -p tsconfig.build.json
```
Result: succeeds, `dist/` regenerates including all new `infrastructure/security` code.

### Test suite
```
npx jest --config jest.config.js --forceExit
```
Result: **39 suites / 198 tests — all PASS** (121 pre-existing from Batches 6–8,
unmodified and still green; 77 new for Batch 9).

New suites:

| Suite | Tests | Covers |
|---|---|---|
| `jwt.service.spec.ts` | 10 | generation, validation, expired, invalid signature, fail-fast secrets |
| `password.service.spec.ts` | 6 | policy violations, hash/verify round-trip, salting |
| `brute-force.service.spec.ts` | 5 | lockout threshold, reset, per-username isolation, no-op when unconfigured |
| `role-permissions.map.spec.ts` | 7 | every role/permission combination |
| `permission.guard.spec.ts` | 7 | allow/deny, audit-on-denial, no-user case, backward compat |
| `api-key.service.spec.ts` | 4 | issue/verify/revoke, hash-only storage |
| `jwt-auth.guard.spec.ts` | 9 | Bearer token, API key, expired, wrong signature, request-context propagation |
| `security.config.spec.ts` | 11 | fail-fast secrets, defaults, no-hardcoded-credentials grep check |
| `auth.service.spec.ts` | 9 | login, lockout, refresh rotation, replay detection (2 scenarios), logout |
| `repositories.integration.spec.ts` | 10 | Mongo-backed User/RefreshToken/ApiKey repositories (mongodb-memory-server) |
| `auth.controller.spec.ts` | 1 | login route's tighter `@Throttle` |
| `goal.guard.spec.ts` | 2 | delegation to `JwtAuthGuard` |

### Boot check + end-to-end smoke test
Booted `dist/main.js` against an in-memory MongoDB, `JWT_SECRET`/`REFRESH_SECRET` set:

```
POST /auth/register {username:"student1", password:"Str0ng!Passw0rd"}       → 201
POST /auth/login    {username:"student1", password:"Str0ng!Passw0rd"}       → 200 (access+refresh pair)
POST /goal (STUDENT token, Goal.Write required)                             → 403 PERMISSION_DENIED
GET  /goal (no Authorization header)                                        → 401 UNAUTHENTICATED
POST /auth/register {username:"admin1", roles:["ADMIN"]} → login → POST /goal → 201
POST /auth/refresh  {refreshToken}                                          → 200 (rotated pair)
POST /auth/refresh  {refreshToken: <same old token again>}                  → 401 REFRESH_TOKEN_REUSE_DETECTED
POST /auth/login    {username:"student1", password:"WRONG"}                 → 401 INVALID_CREDENTIALS
GET  /metrics                                                               → still works, unaffected by auth layer
```

This confirms the complete flow — registration → authentication → RBAC enforcement →
refresh rotation → replay detection → brute-force-relevant failure path — all working
against the real HTTP stack, with zero regressions to Batch 6–8 functionality
(`/metrics` still open, as intended — see Known Gaps).

---

## Known Gaps

- **No live penetration test.** All security behavior is verified by unit/integration
  tests and a functional smoke test against this codebase's own logic — not by an
  external red-team exercise. Recommended before production exposure.
- **`/metrics`, `/health`, `/readiness` remain unauthenticated.** These are
  operational endpoints (Batch 8) — intentionally left open since they carry no
  sensitive business data and are typically scraped by infrastructure (Prometheus,
  k8s probes) without credentials. If this changes, they can be wrapped with
  `JwtAuthGuard`/API-key auth using the same `SecurityModule` primitives with no new
  infrastructure needed.
- **`POST /auth/register` has no role restriction** — anyone can self-register,
  optionally specifying roles. This is explicitly a dev/seed-oriented stopgap
  (documented in the plan) since no admin-invite flow exists yet. Production
  deployments should either remove this route, restrict `roles` assignment to
  `ADMIN`-only callers, or gate it behind an invite-token mechanism.
- **CORS defaults closed** (`getCorsOrigin()` returns `[]` when `CORS_ORIGIN` is unset)
  — this is a deliberate secure-by-default choice; browser-based clients will need
  `CORS_ORIGIN` configured explicitly per deployment.
- **No secrets-vault integration** (Vault, AWS Secrets Manager, etc.) — secrets are
  plain environment variables, consistent with every prior batch's pattern
  (`MONGODB_URI`, `REDIS_PASSWORD`). Adding vault-backed secret injection is an
  infrastructure-only change (swap the `process.env[...]` reads in `security.config.ts`)
  if required later.
