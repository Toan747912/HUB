# WP-03 — Rollback Procedure

**Date:** 2026-07-03
**Scope:** `Infrastructure/scripts/rollback.sh`, `Infrastructure/scripts/deploy.sh`

---

## 1. Why rollback works: immutable tagged images

`ReleaseWorkflow.md` publishes every tagged release as an immutable image at
`ghcr.io/<repo>/<app>:vX.Y.Z`. Rolling back is therefore "point Compose at
the previous tag and recreate," not "figure out how to undo a mutated
image." `docker-compose.production.yml` declares
`image: ${IMAGE_REGISTRY:-local}/<app>:${IMAGE_TAG:-latest}` on `ai-backend`
and `frontend` for exactly this purpose (see `DeploymentArchitecture.md` §4).

## 2. Automatic rollback

`deploy.sh` calls `rollback.sh` automatically whenever any stage fails:

- `pre-deploy-check.sh` fails (bad env/config) — nothing was touched yet,
  rollback is a no-op verification pass.
- `backup.sh` fails — deploy stops before `up`, nothing to roll back.
- build/pull fails — same as above.
- `docker compose up -d` fails, or services don't reach `healthy` within
  `HEALTHY_TIMEOUT_SECONDS` — this is the "critical startup error" case
  from the spec. `rollback.sh` is invoked with no `--to-tag`/`--restore-config`
  by default in this path *unless* the operator supplied one; see §3 for
  how to make this fully automatic once a "last known-good tag" pointer
  exists (open item, §5).
- `post-deploy-verify.sh` fails after `up` succeeds — the "readiness fails"
  case. Same handling.

Every attempt (successful or not) is appended to
`Infrastructure/deployment/deployments.log` as a JSON line — this is the
audit trail for "what rolled back, when, and why."

## 3. Manual rollback

```bash
cd Infrastructure/scripts

# Roll back to a previous published image tag:
./rollback.sh --to-tag v1.2.2 --reason "v1.2.3 caused elevated 5xx after deploy"

# Restore configuration from a specific backup snapshot:
./rollback.sh --restore-config backups/20260703T091500Z --reason "bad nginx.conf edit"

# Both at once:
./rollback.sh --to-tag v1.2.2 --restore-config backups/20260703T091500Z --reason "..."
```

`rollback.sh` always re-runs `post-deploy-verify.sh` after acting. If
verification still fails after a rollback, it exits loudly and tells you to
stop — **it does not loop or retry automatically**, because a rollback that
doesn't restore health means the previous version has its own problem (or
the outage is not deploy-related at all, e.g. a Mongo host failure), and an
automated retry loop would burn time better spent on manual investigation.

## 4. Rollback rehearsal

Run this periodically (and after any change to `deploy.sh`/`rollback.sh`)
against a disposable stack, not production:

```bash
cd Infrastructure/scripts
./deploy.sh --version v-test-1          # cold start, establishes a baseline
./backup.sh                              # confirm a real snapshot is produced
./rollback.sh --restore-config "$(ls -1dt backups/*/ | head -1)" --reason "rehearsal"
./post-deploy-verify.sh                  # confirm still green after rollback
```

See `DeploymentVerificationChecklist.md` for the actual run of this
rehearsal and its evidence.

## 5. Automatic "last known-good" tag capture

Before recreating containers, `deploy.sh` inspects the currently-running
`ai-backend` container (`docker inspect --format '{{.Config.Image}}'`) and
remembers its tag as `PREV_TAG`. On a cold start there is no running
container, so `PREV_TAG` is empty and an automatic rollback in that case is
config-only (there is nothing to revert *to* — the deploy that failed was
the first one). On a redeploy, if the new deploy fails at any later stage,
`abort()` passes `--to-tag "$PREV_TAG"` to `rollback.sh` automatically —
an unattended CI-triggered deploy failure rolls back to the exact image
that was serving traffic before, without an operator needing to know or
supply that tag by hand.

## 6. Known limitation

`PREV_TAG` is captured only from `ai-backend`'s running container; it
assumes `ai-backend` and `frontend` are always deployed at the same release
tag (true for this repo's `ReleaseWorkflow.md`, which tags both from the
same Git tag). If they are ever deployed independently, this capture logic
would need to track both services' tags separately — flagged here rather
than silently assumed to generalize.
