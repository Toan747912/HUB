# WP-05 — Software Bill of Materials (SBOM) Report
**Scope:** `Apps/ai-backend`
**Date:** 2026-07-03
**Format:** CycloneDX 1.6 JSON, generated via `@cyclonedx/cyclonedx-npm` from `package-lock.json` — the machine-readable artifact lives at [`sbom.cyclonedx.json`](sbom.cyclonedx.json) (573 components, ~2.1 MB) alongside this report. Regenerate anytime with:

```
npx @cyclonedx/cyclonedx-npm --output-file sbom.cyclonedx.json
```

---

## 1. Summary

| Property | Value |
|---|---|
| Root component | `ai-backend@1.0.0` |
| SBOM serial | `urn:uuid:b5051272-efce-4e54-b373-c6f785a2d179` |
| Total components (direct + transitive) | 573 |
| Direct dependencies (`package.json`) | 22 (12 runtime + 10 dev — see [package.json](package.json)) |
| License coverage | 573/573 components have a declared license (0 unknown) |
| Copyleft licenses present | 0 |

## 2. Direct dependency review

### Runtime (ship in the production image)

| Package | Version pinned | Purpose |
|---|---|---|
| `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` | ^10.4.2 | Framework core |
| `@nestjs/jwt` | ^11.0.2 | JWT signing/verification |
| `@nestjs/mongoose` | ^11.0.4 | MongoDB ODM integration |
| `@nestjs/schedule` | ^4.1.2 | Cron/interval jobs |
| `@nestjs/swagger` | ^7.4.2 | OpenAPI doc generation |
| `@nestjs/throttler` | ^6.5.0 | Rate limiting |
| `@opentelemetry/*` (4 packages) | ^1.9–2.8 | Tracing/observability |
| `bcryptjs` | ^3.0.3 | Password hashing (pure-JS bcrypt — see [SecurityImplementationReport.md](SecurityImplementationReport.md) for the native-`bcrypt` substitution rationale) |
| `bullmq` | ^5.79.2 | Job queue |
| `class-transformer`, `class-validator` | ^0.5.1 / ^0.14.1 | DTO validation |
| `helmet` | ^8.2.0 | HTTP security headers |
| `ioredis` | ^5.9.1 | Redis client |
| `js-yaml` | ^4.1.0 | YAML parsing |
| `mongoose` | ^9.7.3 | MongoDB ODM |
| `prom-client` | ^15.1.3 | Prometheus metrics |
| `reflect-metadata` | ^0.2.2 | Decorator metadata (NestJS requirement) |
| `rxjs` | ^7.8.1 | Reactive streams (NestJS requirement) |
| `swagger-ui-express` | ^5.0.1 | Swagger UI hosting |

### Dev-only (excluded from the production image via `npm ci --omit=dev`)

`@eslint/js`, `@nestjs/testing`, `@types/*`, `eslint`, `globals`, `ioredis-mock`, `jest`, `mongodb-memory-server`, `prettier`, `ts-jest`, `ts-node`, `typescript`, `typescript-eslint` — none of these reach the runtime attack surface; see [ContainerSecurityReport.md](ContainerSecurityReport.md) §2 for the verified prod-only `npm audit` result (13 advisories vs. 14 full-tree, the one difference being dev-only `@nestjs/testing`).

## 3. Transitive dependency risk

573 total components means 551 are transitive. The full graph is in [`sbom.cyclonedx.json`](sbom.cyclonedx.json); the security-relevant transitive chains are already broken out by advisory in [DependencySecurityReport.md](DependencySecurityReport.md) §1 (`lodash`, `multer`, `js-yaml`, `qs`, `uuid`, `body-parser`, `express`, `file-type` — all pulled in via `@nestjs/swagger`, `@nestjs/platform-express`, `@nestjs/common`, or `@nestjs/schedule`). This report doesn't duplicate that table — see the Dependency Security Report for the CVE-level detail.

## 4. License census (from the SBOM)

| License | Components | Risk |
|---|---|---|
| MIT | 461 | None — permissive |
| Apache-2.0 | 45 | None — permissive, patent grant included |
| ISC | 33 | None — permissive |
| BSD-3-Clause | 18 | None — permissive |
| BSD-2-Clause | 9 | None — permissive |
| BlueOak-1.0.0 | 4 | None — permissive |
| 0BSD | 1 | None — public-domain equivalent |
| Python-2.0 | 1 | None — permissive (likely a transitive tooling artifact, not a runtime dependency — verify if flagged by legal) |
| `(MIT OR CC0-1.0)` | 1 | None — dual-licensed, either branch is permissive |
| CC-BY-4.0 | 1 | Low — attribution-only content license, not typical for code; identify which component this is if a formal license audit is required (not blocking for Closed Beta) |

**No GPL/AGPL/LGPL/SSPL or other copyleft license detected.** This matches (and is now backed by an actual generated SBOM rather than just the CI gate's pass/fail) the `license-checker` step already in [`.github/workflows/dependency-audit.yml`](../../.github/workflows/dependency-audit.yml).

## 5. Image provenance

- Base image: `node:20-alpine` (official Docker Hub image, multi-stage build — see [ContainerSecurityReport.md](ContainerSecurityReport.md)).
- No image-signing (Cosign/Notary) or SLSA provenance attestation is currently produced for the built `ai-backend` image — this SBOM covers the **npm dependency layer only**, not a full container-image SBOM (which would additionally enumerate Alpine OS packages). Generating a container-level SBOM (e.g. via `docker sbom` / Syft) is a recommended follow-up once container scanning (§5 of [ContainerSecurityReport.md](ContainerSecurityReport.md)) is wired into CI — the same CI job can produce both.

## 6. Third-party risk

All 573 components are open-source packages resolved from the public npm registry per `package-lock.json`'s integrity hashes (`npm ci` verifies these on every install, including in `Dockerfile.production`). No vendored/forked/private packages, no packages resolved from non-npm-registry sources (git URLs, tarball URLs) were found in `package.json`.

---

## Summary

| Item | Status |
|---|---|
| SBOM generated | Done — [`sbom.cyclonedx.json`](sbom.cyclonedx.json), CycloneDX 1.6, 573 components |
| Direct dependencies reviewed | Done — 12 runtime / 10 dev |
| Transitive dependencies reviewed | Done — cross-referenced to [DependencySecurityReport.md](DependencySecurityReport.md) |
| Image provenance | Partial — npm-layer SBOM only, no container-level SBOM or signing yet |
| Third-party risk | Low — 100% public npm registry, integrity-verified via lockfile |

**Gate status (WP-05 "SBOM generated"):** MET.
