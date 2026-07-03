# WP-05 — Container Security Report
**Scope:** `Apps/ai-backend/Dockerfile.production` (the image actually shipped by [docker-compose.production.yml](../../docker-compose.production.yml))
**Date:** 2026-07-03
**Method:** local `docker build` + `docker inspect`/`docker run` introspection of the resulting image. **`docker scout`, `trivy`, and `grype` are not usable in this sandbox** — `docker scout` requires a Docker Hub login this session does not have, and neither `trivy` nor `grype` binaries are installed. This report documents what was verified directly and what still needs a CVE-scanner run in CI before Closed Beta. See §5.

---

## 1. Build verification

```
docker build -f Dockerfile.production -t ai-backend:wp05-scan .
```
Result: **builds successfully**, multi-stage (`deps` → `build` → `prod-deps` → `runtime`), final image `67.5 MB`.

## 2. Image composition

| Property | Value | Verified via |
|---|---|---|
| Base image | `node:20-alpine` (runtime stage) | [Dockerfile.production:25](Dockerfile.production#L25) |
| Base OS | Alpine Linux 3.23.4 | `docker run --entrypoint sh ai-backend:wp05-scan -c "cat /etc/os-release"` |
| Node.js runtime | v20.20.2 | `docker run ... node --version` |
| Installed OS packages | 18 (`apk list --installed`) | minimal — Alpine's small package count is itself a risk-reduction property vs. Debian-based images |
| Final image contents | `dist/`, `node_modules` (prod-only), `package*.json` | `docker run --entrypoint sh ... ls -la /app` |
| Runtime user | **non-root** — `nestjs` (uid 100, gid 101) | `docker run ... whoami && id` → `uid=100(nestjs) gid=101(nodejs)` |
| `npm ci --omit=dev` used for the shipped image | Yes | [Dockerfile.production:22](Dockerfile.production#L22) — dev dependencies (jest, eslint, ts-node, etc.) are not present in the runtime layer |
| `HEALTHCHECK` | Present | [Dockerfile.production:39-40](Dockerfile.production#L39-L40) — hits `/health` via `node -e`, no extra shell/curl dependency needed |
| Secrets baked into image | **None found** | `.dockerignore` excludes `.env`, `.env.*`, `.git`; `docker history` shows no `ENV JWT_SECRET=...`-style layers; all secrets are runtime env vars injected via `docker-compose.production.yml`'s `${VAR:?required}` syntax |
| `.dockerignore` hygiene | PASS | excludes `node_modules`, `dist`, `coverage`, `.env*`, `.git`, `__tests__`, `**/*.spec.ts`, `*.md` — keeps the build context (and any accidental secret files) out of the image |

## 3. Findings

| # | Finding | Severity | Detail |
|---|---|---|---|
| 1 | Non-root runtime user | — (control, not a finding) | `USER nestjs` set before `CMD`; confirms least-privilege at the container level |
| 2 | Legacy `Dockerfile` (non-`.production`) still present | **Low** | [Dockerfile](Dockerfile) is single-stage, runs `npm install` (not `npm ci` — non-reproducible builds) as **root** (no `USER` directive), and ships the full `node_modules` including dev deps. Not referenced by `docker-compose.production.yml`, so it isn't the production attack surface today — but it's a live footgun if anyone points a deploy pipeline at it. **Recommend deleting it or renaming clearly as `Dockerfile.dev`.** |
| 3 | No CVE scan of the base image / OS packages has ever been run | **Medium (process gap)** | Neither `trivy`, `grype`, nor `docker scout` (authenticated) is wired into CI today — [`.github/workflows/`](../../.github/workflows) has no container-scan step. `node:20-alpine` is a maintained, frequently-patched base, but "frequently patched upstream" is not the same as "scanned in this pipeline." This is the WP-05 quality gate ("container scan completed") that is **not yet met** — see §5. |
| 4 | `npm audit` (prod-only, matching what actually ships) | **High** (carried from [DependencySecurityReport.md](DependencySecurityReport.md)) | `npm audit --omit=dev`: **0 critical / 3 high / 10 moderate** (13 total — one fewer than the full-tree 14, since `@nestjs/testing` is dev-only and isn't in the runtime image). The 3 High findings (`lodash` via `@nestjs/swagger`, `multer` DoS chain via `@nestjs/platform-express`) **do ship in the production image**, since Swagger and Express/Multer are runtime dependencies, not dev-only. |
| 5 | Root-owned files inside a non-root-run container | Informational | `package*.json`/`dist`/`node_modules` are owned by `root:root` even though the process runs as `nestjs`; this is normal for a `COPY`-then-`USER`-switch Dockerfile and only matters if the app ever needs to write to `/app` at runtime (it doesn't — no volume mounts into `/app` in `docker-compose.production.yml`). No action needed. |

## 4. What was NOT verified (scanner unavailable)

- **OS-package CVEs** in Alpine 3.23.4's 18 installed packages (musl, busybox, etc.) — needs `trivy image ai-backend:wp05-scan` or `grype ai-backend:wp05-scan` run in an environment with registry/vulnerability-DB network access.
- **Node.js runtime CVEs** for the pinned v20.20.2 build — same tooling gap.
- Image layer history was inspected manually via `docker inspect`/`docker run`, not via an automated SBOM-diff tool.

## 5. Required follow-up (blocks the WP-05 "container scan completed" gate)

Add a container-scan job to CI, e.g. extend [`.github/workflows/dependency-audit.yml`](../../.github/workflows/dependency-audit.yml) or `ci.yml` with:

```yaml
  container-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build production image
        run: docker build -f Apps/ai-backend/Dockerfile.production -t ai-backend:ci Apps/ai-backend
      - name: Trivy scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ai-backend:ci
          severity: CRITICAL,HIGH
          exit-code: "1"
```

This is a CI/infra change, not a code change — flagged here as the concrete action item rather than implemented inline in this WP-05 pass.

---

## Summary

| Item | Status |
|---|---|
| Image builds | PASS |
| Non-root runtime user | PASS |
| Secrets not baked into image | PASS |
| Multi-stage build, dev deps excluded from runtime | PASS |
| `.dockerignore` hygiene | PASS |
| Legacy insecure `Dockerfile` retired or renamed | **GAP — action item** |
| OS/base-image CVE scan (Trivy/Scout/Grype) wired into CI | **GAP — not yet run, tooling unavailable in this sandbox** |
| npm-level vulnerabilities present in shipped image | **FAIL** — 3 High (tracked in [DependencySecurityReport.md](DependencySecurityReport.md)) |

**Gate status:** WP-05's "container scan completed" quality gate is **NOT MET** — this report substitutes a manual image/Dockerfile review for the automated scan, which still needs to run (§5) before Closed Beta sign-off.
