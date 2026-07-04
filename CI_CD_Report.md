# WP-02 — CI/CD & Release Automation Report

**Date:** 2026-07-03
**Scope:** `Apps/ai-backend` (NestJS/TS), `Apps/backend` (Express/JS), `Apps/frontend` (Next.js/TS), `Apps/ai-service` (FastAPI/Python)
**Out of scope:** `Apps/admin` (no code yet — README only)

---

## 1. What was built

| Workflow | Trigger | Purpose |
|---|---|---|
| `.github/workflows/ci.yml` | push to `main`/`develop`/`release/**`/`hotfix/**`, pull requests | Checkout → toolchain setup → install → typecheck → lint → unit tests → integration smoke test → Docker build → security scan → single required status check |
| `.github/workflows/release.yml` | push of a `vX.Y.Z(-suffix)` tag | Validates the tag is semver, builds and pushes versioned Docker images to GHCR, publishes a GitHub Release with auto-generated notes |
| `.github/workflows/dependency-audit.yml` | daily cron (06:00 UTC) + manual dispatch | `npm audit` / `pip-audit` for known CVEs, `npm outdated`, license-compliance check |
| `.github/workflows/code-quality.yml` | pull requests | Prettier formatting check, ESLint static analysis, coverage-threshold enforcement (uploads coverage as PR artifacts) |

Each Node app (`ai-backend`, `backend`, `frontend`) is driven independently via a `matrix` so failures are attributable to a single app rather than the whole pipeline. The Python service (`ai-service`) has its own job using `pip` + `pytest` + `ruff`.

## 2. Repository changes required to make the pipeline real (not a stub)

The spec's pipeline stages (typecheck, lint, unit tests, coverage) only have teeth if the underlying app actually has the tooling wired up. Before writing the workflow YAML, the following gaps were found and closed:

- **ESLint was referenced in `ai-backend`'s `lint` script but never installed or configured.** Added `eslint` 9 (flat config) + `typescript-eslint` to `ai-backend` and `frontend`, and a plain `@eslint/js` flat config to `backend`. Fixed the resulting findings (stray `require()`-based rule references, missing Node/Jest globals in config files, one dead `eslint-disable` comment for a plugin that isn't installed).
- **No `typecheck` script existed.** Added `tsc --noEmit` scripts to `ai-backend` (via `tsconfig.test.json`, which is the only tsconfig that includes Jest types) and `frontend`. `backend` is plain JS — no typecheck stage applies.
- **No coverage thresholds were enforced anywhere.** Added `coverageThreshold` blocks to all three `jest.config.js` files, set a few points below each app's actual current coverage (measured locally) so the gate is real but doesn't fail on day one:
  - `ai-backend`: statements 45 / branches 28 / functions 50 / lines 50
  - `frontend`: statements 35 / branches 25 / functions 28 / lines 33
  - `backend`: statements 70 / branches 30 / functions 45 / lines 70
- **No formatting tooling existed.** Added Prettier + `.prettierrc.json`/`.prettierignore` to all three apps, ran a one-time `prettier --write` pass across `ai-backend` and `frontend` (whitespace/quote-style only — re-verified lint, typecheck, tests, and build all still pass after), and added `format`/`format:check` scripts.
- **One dead test was found and removed:** `Apps/frontend/__tests__/critical-path.test.jsx` imported `../app/page` (a pre-`src/app` scaffold route) and could never resolve against the current Next.js App Router structure. It tested functionality (`fetch`-driven items list) that no longer exists in `src/app/page.tsx`. Removed rather than patched, since there is nothing left to test.

All four `npm run lint`, `npm run typecheck`, `npm run test:ci`, and `npm run build` (where applicable) were run locally end-to-end for every app and confirmed green before the workflows were written around them.

## 3. Design decisions

- **Docker registry:** GitHub Container Registry (`ghcr.io/<repo>/<app>`), authenticated with the built-in `GITHUB_TOKEN` — no extra secrets required once the repo is pushed to GitHub.
- **No git remote exists yet** (`git remote -v` is empty at the time of writing). The workflows are written to standard GitHub Actions conventions and will activate the moment the repository is pushed to GitHub; nothing in them depends on a remote being present today.
- **Integration stage** is realized as a `docker compose up` of the real stack (Mongo, Redis, `ai-backend`, `ai-service`, `frontend`) with polling health checks (`/health`, `/api/health`, `/`) rather than a separate hand-written integration test suite — the repo did not have one, and this exercises real inter-service wiring (env vars, ports, Mongo/Redis connectivity) that unit tests with `mongodb-memory-server` cannot catch.
- **`ci-complete` job** in `ci.yml` fans in every other job via `needs:` so branch protection only needs to require one status check.
- **`Apps/admin`** is excluded from all workflows — it has no `package.json`, only a `README.md`.

## 4. Known findings from wiring up real audits (not fixed — out of scope for this pass)

Running `npm audit --audit-level=high` locally today surfaces pre-existing high-severity transitive vulnerabilities:

- `ai-backend`: 3 high / 11 moderate (largely `uuid` via `@nestjs/schedule`'s transitive tree; the available fix is a breaking `@nestjs/schedule@6` upgrade)
- `frontend`: 1 high / 1 moderate (`postcss` via `next`; the available fix is a breaking `next@16` upgrade)
- `backend`: clean

This is expected and correct behavior for `dependency-audit.yml` — it is a scheduled, non-blocking workflow whose entire purpose is to surface exactly this kind of debt for triage. No dependency upgrades were made as part of this pass; that is a separate, deliberate decision (major-version bumps of Next.js/NestJS scheduling are not something to fold into a CI/CD task silently).

## 5. Deliverables

- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `.github/workflows/dependency-audit.yml`
- `.github/workflows/code-quality.yml`
- `CI_CD_Report.md` (this file)
- `PipelineCertificationChecklist.md`
- `ReleaseWorkflow.md`
- `.nvmrc` (Node 20, matching all four Dockerfiles)
