# AI Backend — Secret Rotation Runbook
**Workstream:** WP-06 — Operations, Monitoring & Closed Beta Readiness
**Audience:** operators rotating secrets on the production stack
**Date:** 2026-07-03

Operator-facing step-by-step counterpart to [SecretsManagementGuide.md](SecretsManagementGuide.md) §5, which documents blast radius. This runbook is the *how*; that guide is the *what/why*.

---

## Before rotating anything

- Confirm which secret and why (scheduled rotation vs. suspected compromise — if compromise, see `SecurityRunbook.md` first for containment, then return here to complete rotation).
- All rotation today is **manual, operator-triggered** — there is no automated/scheduled rotation for any secret (`SecretsManagementGuide.md` §5).
- Every secret is read via `docker-compose.production.yml`'s `${VAR:?required}` interpolation from the host's `.env` — rotating means editing `.env` and recreating the affected container(s), not a live in-process reload.

## Procedure by secret

### `JWT_SECRET` / `REFRESH_SECRET`
```bash
# Generate a new value (example — use your own secret-generation standard):
openssl rand -base64 48
```
1. Update the value in `.env`.
2. `docker compose -f docker-compose.production.yml up -d --force-recreate ai-backend`
3. **Impact:** all active access/refresh tokens are invalidated immediately — every logged-in user must re-authenticate. Plan a maintenance window or accept the forced-relogin UX; this is not a zero-downtime rotation (no dual-key/grace-period verification exists).
4. Verify: `./Infrastructure/scripts/post-deploy-verify.sh`, then confirm a fresh login succeeds against the new secret.

### `MONGODB_URI` password
1. Rotate the password on the MongoDB side first (`db.changeUserPassword(...)` or the root-credential equivalent — see Known gaps about root-credential usage).
2. Update `MONGODB_URI` (or `MONGO_ROOT_PASSWORD`, which the URI is templated from) in `.env`.
3. `docker compose -f docker-compose.production.yml up -d --force-recreate mongo ai-backend`
4. **Impact:** brief downtime unless done via a blue/green deploy (not currently set up for Mongo credential changes specifically).
5. Verify: `/readiness` returns 200 with `checks.database` healthy.

### `REDIS_PASSWORD`
1. `redis-cli -a <old-password> CONFIG SET requirepass <new-password>` (live rotation on the Redis side, no restart needed for Redis itself).
2. Update `REDIS_PASSWORD` in `.env`.
3. `docker compose -f docker-compose.production.yml up -d --force-recreate ai-backend`
4. **Impact:** brute-force lockout counters reset (acceptable, not security-relevant data per `SecurityRunbook.md`). BullMQ/cache reconnect using the new password — expect a brief reconnect gap, not data loss.
5. Verify: `/readiness` returns 200 with `checks.redis` healthy.

### API keys
1. `ApiKeyService.revoke(id)` for the old key (programmatic only — no HTTP endpoint exists today, see `SecurityRunbook.md`).
2. `ApiKeyService.issue(label)` for the replacement — the raw key is returned exactly once; capture and distribute it out-of-band immediately.
3. **Impact:** immediate — no grace-period/dual-key overlap exists. Coordinate with the key's consumer *before* revoking, or the consumer will see hard auth failures with no warning.

### `MONGO_ROOT_USER` / `MONGO_ROOT_PASSWORD`
1. Standard MongoDB root-credential rotation on the `mongo` container.
2. Update both vars in `.env`.
3. `docker compose -f docker-compose.production.yml up -d --force-recreate mongo ai-backend`
4. **Impact:** full-stack restart of both containers required — plan a maintenance window.

## After any rotation

```bash
cd Infrastructure/scripts
./post-deploy-verify.sh
```
Confirm `/health`, `/readiness` (all `checks` green), and `/metrics` all pass before considering the rotation complete. Log the rotation (who/when/why/which secret) — there is no built-in rotation audit log today; use whatever incident/change record `IncidentResponseGuide.md`/change-management process specifies.

## Known gaps

- No automated or scheduled rotation for any secret — recommend documenting an actual cadence (e.g. quarterly for `JWT_SECRET`/`REFRESH_SECRET`) as an operational SLA before General Availability, per `SecretsManagementGuide.md` §5.
- No secrets-vault integration (Vault, AWS Secrets Manager, Doppler) — rotation is a manual `.env` edit plus container recreate. Accepted for Closed Beta scale; escalate before scaling past it or onboarding a second environment.
- `ai-backend` uses MongoDB **root** credentials for routine app access (no scoped, database-specific user) — rotating the root password is higher blast-radius than necessary. `SecretsManagementGuide.md` §6 recommends creating a scoped `ai-backend` Mongo user before Closed Beta; doing so would also make routine credential rotation lower-risk.
