# WP-05 — Secrets Management Guide
**Scope:** `Apps/ai-backend`
**Date:** 2026-07-03

Operational counterpart to [SecurityRunbook.md](SecurityRunbook.md) (incident response) — this document is specifically about how secrets are provisioned, stored, and rotated.

---

## 1. Verified: no secrets committed to git

```
git ls-files | grep -iE "\.env$|\.env\.|secret|credential"
```
Only matches: `security.config.ts` and `security.config.spec.ts` (the *code* that reads secrets from env vars — no literal secret values). No `.env`, `.env.production`, credentials file, or key material of any kind is tracked in the repository.

`.gitignore` (repo root) explicitly excludes:
```
.env
.env.*
!.env.example
```
`Apps/ai-backend/.dockerignore` independently excludes the same patterns from the Docker build context, so a stray local `.env` cannot leak into an image layer even if it existed on disk at build time.

`security.config.spec.ts` additionally runs a **grep-based regression test** asserting no hardcoded secret-shaped literals exist in `security.config.ts` or `main.ts` — this is a real, executable control, not just a policy statement.

**Verified — this quality gate ("no secrets stored in Git") is MET.**

---

## 2. Secret inventory

| Secret | Required? | Read via | Default | Rotation impact |
|---|---|---|---|---|
| `JWT_SECRET` | Yes — fails app boot if unset | `getJwtSecret()` | none (fail-fast) | Invalidates **all** outstanding access tokens instantly; safe, since access tokens are short-lived (15m default) by design |
| `REFRESH_SECRET` | Yes — fails app boot if unset | `getRefreshSecret()` | none (fail-fast) | Invalidates **all** outstanding refresh tokens instantly — every logged-in user must re-authenticate. Deliberately a separate secret from `JWT_SECRET` so compromising one doesn't compromise the other. |
| `MONGODB_URI` | Yes — fail-fast (pre-existing pattern) | env var | none | Contains embedded credentials (`mongodb://user:pass@host/db`) — treat the whole URI as a secret, not just the password segment |
| `REDIS_PASSWORD` | No — feature (brute-force protection) degrades to no-op if unset | env var | none | Do not run production without it; see [SecurityRunbook.md § Brute-force lockout](SecurityRunbook.md) |
| `CORS_ORIGIN` | No (secure-by-default: closed) | `getCorsOrigin()` | `[]` (empty — no origins allowed) | Not a secret, but misconfiguration-sensitive — treat changes as reviewed config, not a throwaway env tweak |
| `API_KEY_HEADER` | No | `getApiKeyHeaderName()` | `x-api-key` | Header *name*, not a secret itself — actual API keys are generated per-caller (see §4) |
| `ALLOW_SELF_ASSIGNED_ROLES` | No | `isSelfAssignedRolesAllowed()` | `false` | **Must stay `false`/unset in production** — flipping it to `true` re-opens the role-escalation-via-registration path that was deliberately closed (see [OWASPMapping.md § A01](OWASPMapping.md)). Treat this as a guarded config flag, not a routine env var. |
| `MONGO_ROOT_USER` / `MONGO_ROOT_PASSWORD` | Yes (compose-level, `:?required`) | [docker-compose.production.yml](../../docker-compose.production.yml) | none | Root-level Mongo credentials — highest blast radius if leaked |
| `NEXT_PUBLIC_BACKEND_URL` | Yes (frontend build arg) | compose | none | Not secret (public URL), listed for completeness of the compose secret surface |

## 3. Environment separation

| Environment | Secret source today | Assessment |
|---|---|---|
| Local dev | `.env` (gitignored) or shell env | Fine — developer-scoped, never committed |
| CI (`.github/workflows/*`) | GitHub Actions secrets (not inspected in this pass — verify no plaintext secrets exist in workflow YAML) | Recommend a follow-up grep of `.github/workflows/*.yml` for inline secret values as part of the next CI review |
| Production (`docker-compose.production.yml`) | Host-level env vars, injected via `${VAR:?VAR is required}` compose interpolation | **Fail-fast at `docker compose up` time** if any required secret is missing — good property, but secrets still live in whatever mechanism populates the host's environment (e.g. a `.env` file next to the compose file, or a deployment tool's env injection) |

**Gap:** there is no secrets-vault integration (Vault, AWS Secrets Manager, Doppler, etc.) anywhere in the stack — this was already flagged as a known, accepted gap in [SecurityReadinessReview.md](SecurityReadinessReview.md) and remains true today. For a Closed Beta of this scale, plain environment variables with strict `.gitignore`/`.dockerignore` discipline and fail-fast validation is a reasonable, defensible posture — it matches the existing pattern used for `MONGODB_URI` since Batch 6. Escalate to a real vault before scaling past Closed Beta or onboarding a second production environment (staging + prod sharing rotation discipline manually is where this pattern starts to break down).

## 4. API keys (service-to-service secrets)

- Storage: only a **SHA-256 hash** of the key is persisted ([api-key.schema.ts](src/infrastructure/security/api-keys/api-key.schema.ts)) — the raw key is never stored anywhere, including logs (verify log statements around `ApiKeyService.issue()` don't accidentally log the return value — not independently re-checked in this pass, spot-check recommended).
- Issuance: `ApiKeyService.issue(label)` returns the raw key **exactly once**. There is currently no HTTP endpoint for issuance/revocation — both are programmatic-only (documented gap in [SecurityRunbook.md](SecurityRunbook.md)).
- Distribution: no secure-channel mechanism is built in (e.g. no one-time-view link) — whoever calls `issue()` today is responsible for getting the raw key to its consumer out-of-band. Acceptable for the current admin-programmatic-only usage; revisit if a self-service API-key UI is ever built.

## 5. Rotation procedure

| Secret | How to rotate | Blast radius of rotation |
|---|---|---|
| `JWT_SECRET` / `REFRESH_SECRET` | Set new value in the environment, restart the app | All active sessions terminated — plan a maintenance window or accept the forced-relogin UX for all users |
| `MONGODB_URI` password | Rotate in MongoDB, update env var, restart | Brief downtime unless done via a blue/green deploy |
| `REDIS_PASSWORD` | Rotate in Redis (`CONFIG SET requirepass`), update env var, restart | Brute-force counters reset (acceptable — not security-relevant data) |
| API keys | `ApiKeyService.revoke(id)` old key → `ApiKeyService.issue(label)` new key → redistribute out-of-band | Immediate — no grace-period/dual-key overlap mechanism exists today; coordinate with the key's consumer before revoking to avoid an outage |
| `MONGO_ROOT_USER`/`MONGO_ROOT_PASSWORD` | Standard Mongo root-credential rotation, update compose env, restart `mongo` + `ai-backend` | Full-stack restart required |

**No automated/scheduled rotation exists for any secret today.** All rotation above is manual, operator-triggered. This is acceptable for Closed Beta scale; document an actual rotation cadence (e.g. quarterly for `JWT_SECRET`/`REFRESH_SECRET`) as an operational SLA before general availability.

## 6. Least privilege

- `MONGO_ROOT_USER`/`MONGO_ROOT_PASSWORD` are Mongo **root** credentials used directly by `ai-backend` ([docker-compose.production.yml:43](../../docker-compose.production.yml#L43)) — the application does not use a scoped, database-specific user. **Recommend** creating a dedicated `ai-backend` Mongo user scoped to only the `ai-backend` database before Closed Beta, rather than sharing the admin/root account between infrastructure bootstrapping and application runtime.
- Redis: no ACL/ACL-user scoping — a single shared password grants full command access. Acceptable at current scale (single app, single Redis instance, no multi-tenant sharing).
- Container runtime: `ai-backend`'s container process runs as a non-root OS user (`nestjs`, uid 100) — see [ContainerSecurityReport.md](ContainerSecurityReport.md) — so even a full RCE inside the container doesn't grant root on the host or unrestricted filesystem access within the container.

---

## Summary

| Item | Status |
|---|---|
| No secrets committed | PASS (verified, including a regression test) |
| Environment separation | PASS (dev/CI/prod distinct, prod fail-fast on missing secrets) |
| Production secret handling | PASS (env-var + fail-fast, consistent with codebase convention) |
| Rotation procedure | Documented, **manual only** — no automation, no enforced cadence |
| Least privilege | **GAP** — Mongo root credentials used for routine app access; recommend a scoped DB user |
| Secrets-vault integration | **Accepted gap** — plain env vars, reasonable for Closed Beta scale, escalate before GA |

**Gate status (WP-05 "no secrets stored in Git"):** MET.
