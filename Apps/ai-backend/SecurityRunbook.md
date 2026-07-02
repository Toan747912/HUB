# AI Backend — Security Runbook
**Batch:** 9 — Security Foundation
**Audience:** on-call engineers / security responders operating `Apps/ai-backend`

---

## Where things live

| Concern | Where |
|---|---|
| Users | MongoDB `users` collection (`username`, `passwordHash`, `roles[]`) |
| Refresh tokens | MongoDB `refresh_tokens` collection (`jti`, `familyId`, `consumedAt`, `revokedAt`) |
| API keys | MongoDB `api_keys` collection (SHA-256 hash only, never the raw key) |
| Security audit trail | MongoDB `audit_events` collection (same collection as Batch 8's domain-event audit, distinguished by `operation`) |
| Auth routes | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` |
| RBAC enforcement | `PermissionGuard` + `@RequirePermissions(...)` on `goal.controller.ts` routes |
| Secrets | `JWT_SECRET`, `REFRESH_SECRET`, `MONGODB_URI`, `REDIS_PASSWORD`, `CORS_ORIGIN`, `API_KEY_HEADER` — all environment variables, no hardcoded values anywhere in the codebase |

Query the audit trail for a specific user's security history:
```js
db.audit_events.find({ userId: "<user-id>" }).sort({ timestamp: -1 })
```

Query for a specific incident type:
```js
db.audit_events.find({ operation: "REFRESH_TOKEN_REUSE_DETECTED" }).sort({ timestamp: -1 })
```

---

## Incident response procedures

### Compromised refresh token / suspected session hijack
**Signal:** an `audit_events` row with `operation: "REFRESH_TOKEN_REUSE_DETECTED"`.

This means a refresh token that had *already been rotated* (i.e., already exchanged for
a newer one) was presented again. The system has **already automatically revoked the
entire token family** — no further action is strictly required for containment, but:

1. Identify the affected user from the audit row's `userId`.
2. Check `audit_events` for that `userId` around the same time window for `LOGIN_SUCCESS`
   events from unfamiliar sources (if IP/user-agent logging is added later, cross-reference
   here — not currently captured in the audit payload).
3. Force a fresh login: the user's entire token family is already revoked, so their
   current access token remains valid only until its short TTL (`ACCESS_TOKEN_TTL`,
   default 15m) expires — after that, all further requests require a new login.
4. If this appears to be a genuine compromise (not a client bug replaying a request):
   consider rotating the user's password (no built-in force-password-reset endpoint
   exists yet — this requires a direct database update to `passwordHash` via a
   temporary maintenance script, or extending `AuthService` with an admin-triggered
   `forcePasswordReset`).
5. Document the incident; `REFRESH_TOKEN_REUSE_DETECTED` audit rows are the canonical
   evidence trail.

### Brute-force lockout
**Signal:** `audit_events` rows with `operation: "LOGIN_FAILED"` clustering for one
`resource: "User:<username>"`, or a user reporting they're locked out.

- The lockout is Redis-backed (`bruteforce:login:<username>`, 5 failures / 15-minute
  sliding window, auto-expires). No manual unlock endpoint exists.
- **To manually clear a lockout** (e.g., confirmed the user, not an attacker):
  ```
  redis-cli DEL bruteforce:login:<username>
  ```
- **If Redis is not configured** in this environment, brute-force protection is a
  no-op (documented tradeoff, consistent with every other Redis-optional feature since
  Batch 7) — the global rate limiter (30 req/min) is the only defense in that
  configuration. Do not run without Redis in production.

### API key compromised
1. Identify the key's `_id` (label lookup via `api_keys` collection, matched by
   `label`, not the raw key — raw keys are never stored).
2. Revoke: call `ApiKeyService.revoke(id)` (currently no HTTP endpoint exposes this —
   it's available programmatically; add an admin route if operational access is
   needed).
3. Issue a replacement via `ApiKeyService.issue(label)` and distribute the new raw key
   through a secure channel (it is returned exactly once, at creation).
4. Audit trail: API key usage does not currently emit its own audit event (only
   JWT-based login/refresh/logout do) — this is a documented gap. If API-key-specific
   auditing becomes necessary, add a `recordSecurityEvent` call in
   `JwtAuthGuard`'s API-key branch.

### Role change
1. Roles are updated via `UserRepository.updateRoles(userId, newRoles)` — no HTTP
   endpoint currently exposes this (documented gap; add an `ADMIN`-only
   `PATCH /auth/users/:id/roles` route using the same `PermissionGuard` pattern if
   needed).
2. The change takes effect on the user's **next login or refresh** — existing access
   tokens carry their roles as claims baked in at issuance time and are not
   retroactively revoked by a role change alone. If immediate revocation is required
   (e.g., de-provisioning a compromised admin), also revoke all of that user's refresh
   token families (`RefreshTokenRepository.revokeFamily(familyId)` for each active
   family) and wait out the access token's TTL (default 15 minutes).

### Suspicious permission-denial pattern
**Signal:** repeated `PERMISSION_DENIED` audit rows for one `userId` against different
`requiredPermissions` in a short window — may indicate reconnaissance/privilege
escalation attempts.

```js
db.audit_events.aggregate([
  { $match: { operation: "PERMISSION_DENIED" } },
  { $group: { _id: "$userId", count: { $sum: 1 } } },
  { $match: { count: { $gte: 10 } } }
])
```

Investigate the account; consider revoking active sessions (see "Role change" above
for the revocation mechanism) pending review.

---

## Configuration reference

| Env Var | Required | Default | Purpose |
|---|---|---|---|
| `JWT_SECRET` | Yes (fail-fast) | — | Signs/verifies access tokens |
| `REFRESH_SECRET` | Yes (fail-fast) | — | Signs/verifies refresh tokens (deliberately separate from `JWT_SECRET` so compromising one doesn't compromise the other) |
| `ACCESS_TOKEN_TTL` | No | `15m` | Access token lifetime (jsonwebtoken duration string) |
| `REFRESH_TOKEN_TTL_SECONDS` | No | `604800` (7 days) | Refresh token lifetime |
| `CORS_ORIGIN` | No | *(empty — closed)* | Comma-separated allowed origins for browser clients |
| `REQUEST_BODY_LIMIT` | No | `1mb` | Max JSON request body size |
| `API_KEY_HEADER` | No | `x-api-key` | Header name checked for service-to-service auth |
| `MONGODB_URI` | Yes (fail-fast, pre-existing) | — | User/refresh-token/API-key/audit storage |
| `REDIS_PASSWORD` / `REDIS_HOST` | No (feature degrades gracefully) | — | Brute-force protection backing store |

---

## What's intentionally NOT covered

- `/health`, `/readiness`, `/metrics` are unauthenticated by design (operational
  endpoints scraped by infrastructure). Do not add sensitive data to their response
  bodies without also adding auth.
- No MFA/2FA. No SSO/OAuth. No password reset flow. No email verification. These are
  reasonable next steps but were out of scope for "Security Foundation" — the goal here
  was the cross-cutting JWT/RBAC/hardening layer, not a full identity product.
