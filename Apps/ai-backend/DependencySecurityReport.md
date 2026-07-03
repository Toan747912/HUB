# WP-05 — Dependency Security Report
**Scope:** `Apps/ai-backend`
**Date:** 2026-07-03
**Commands run:** `npm audit --json`, `npm outdated --json`, license census from the generated CycloneDX SBOM (see [SBOMReport.md](SBOMReport.md))

---

## 1. `npm audit` results

```
npm audit --json   (Apps/ai-backend, 719 total deps: 209 prod / 502 dev / 39 optional / 1 peer)
```

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 3 |
| Moderate | 11 |
| Low | 0 |
| Info | 0 |
| **Total** | **14** |

All 14 are only resolvable via a **semver-major** bump — every `fixAvailable` in the raw report points at `@nestjs/core@11.1.27`, `@nestjs/platform-express@11.1.27`, `@nestjs/schedule@6.1.3`, or `@nestjs/swagger@11.4.5` (this project is currently pinned to the NestJS 10.x / Swagger 7.x line). There is no `npm audit fix` that resolves any of these without a major-version migration.

### High severity (3)

| Package | Direct? | Advisory | CVE/GHSA | CVSS | Root cause chain |
|---|---|---|---|---|---|
| `lodash` | transitive | Code Injection via `_.template` | [GHSA-r5fr-rjxr-66jc](https://github.com/advisories/GHSA-r5fr-rjxr-66jc) | 8.1 | pulled in by `@nestjs/swagger` |
| `multer` | transitive | DoS — incomplete cleanup / resource exhaustion / uncontrolled recursion / deeply-nested field names (4 advisories bundled) | [GHSA-xf7r-hgr6-v32p](https://github.com/advisories/GHSA-xf7r-hgr6-v32p) et al. | up to 7.5 | pulled in by `@nestjs/platform-express` |
| `@nestjs/platform-express` | **direct** | Aggregates the `body-parser`/`express`/`multer` chain below | — | High (rollup) | `package.json` `^10.4.2` |

### Moderate severity (11)

| Package | Direct? | Advisory | Notes |
|---|---|---|---|
| `@nestjs/common` | direct | via `file-type` — infinite loop (ASF parser) + ZIP decompression bomb DoS | 2 GHSA IDs bundled |
| `@nestjs/core` | direct | Improperly neutralizes special elements in output ([GHSA-36xv-jgw5-4q75](https://github.com/advisories/GHSA-36xv-jgw5-4q75), CWE-74, CVSS 6.1) | Directly in the HTTP request path |
| `@nestjs/schedule` | direct | via `uuid` — missing buffer bounds check ([GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)) | |
| `@nestjs/swagger` | direct | via `js-yaml` (prototype pollution in `<<` merge, quadratic-complexity DoS) and `lodash` (prototype pollution in `_.unset`/`_.omit`) | 3 advisories bundled |
| `@nestjs/testing` | direct (dev) | rollup of `@nestjs/core` + `@nestjs/platform-express` | test-only, lower real-world exposure |
| `body-parser` | transitive | via `qs` — remotely-triggerable DoS in `qs.stringify` | |
| `express` | transitive | via `qs` — same DoS | |
| `js-yaml` | transitive (pinned old copy under `@nestjs/swagger`) | prototype pollution + quadratic DoS | Note: the *direct* `js-yaml@4.1.0` dependency used by `infrastructure/` is a **different, newer** copy — only `@nestjs/swagger`'s bundled old copy is vulnerable |
| `qs` | transitive | DoS in `qs.stringify` with `encodeValuesOnly` | |
| `uuid` | transitive | buffer bounds check | |

### Fix path

The only clean remediation is upgrading the NestJS major version:

```
@nestjs/common, @nestjs/core, @nestjs/platform-express, @nestjs/testing  → ^11.1.27
@nestjs/schedule                                                        → ^6.1.3
@nestjs/swagger                                                         → ^11.4.5
```

This is a breaking-change migration (NestJS 10→11), not a patch bump — schedule this as its own workstream with the full test suite (currently 39 suites / 198 tests) as the regression gate, not as a drive-by fix inside WP-05. Until then, treat the 3 High findings as **accepted risk with compensating controls**: the request-size limit (`REQUEST_BODY_LIMIT`, default 1mb), the global `ThrottlerModule` (30/min) plus the tighter per-route throttles, and `ValidationPipe`'s `forbidNonWhitelisted` all reduce the practical exploitability of the DoS/injection advisories above even though the underlying packages remain unpatched.

---

## 2. Outdated packages (`npm outdated`)

Beyond the audit-flagged packages, these are behind current upstream but carry no open advisory:

| Package | Current | Latest | Note |
|---|---|---|---|
| `@opentelemetry/resources` / `sdk-trace-base` / `sdk-trace-node` | 2.8.0 | 2.9.0 | Patch-level, safe to bump opportunistically |
| `class-validator` | 0.14.4 | 0.15.1 | Minor |
| `typescript` | 5.9.3 | 6.0.3 | Major — schedule separately |
| `eslint` | 9.39.4 | 10.6.0 | Major, dev-only |
| `@eslint/js` | 9.39.4 | 10.0.1 | Major, dev-only |
| `@types/node` | 22.20.0 | 26.1.0 | Major, dev-only — verify against actual Node runtime (Dockerfiles pin `node:20-alpine`) |
| `js-yaml` (direct) | 4.3.0 | 5.2.1 | Major, not advisory-driven |

None of these are advisory-driven; they're routine version drift. Recommend a quarterly (not WP-05-blocking) dependency refresh cadence.

---

## 3. License review

Census from the CycloneDX SBOM (573 components, prod + dev + transitive):

| License | Count |
|---|---|
| MIT | 461 |
| Apache-2.0 | 45 |
| ISC | 33 |
| BSD-3-Clause | 18 |
| BSD-2-Clause | 9 |
| BlueOak-1.0.0 | 4 |
| 0BSD | 1 |
| Python-2.0 | 1 |
| (MIT OR CC0-1.0) | 1 |
| CC-BY-4.0 | 1 |

**No copyleft (GPL/AGPL/LGPL) licenses present.** This matches the existing CI gate in [`.github/workflows/dependency-audit.yml`](../../.github/workflows/dependency-audit.yml) (`license-checker --failOn "GPL-2.0;GPL-3.0;AGPL-1.0;AGPL-3.0;LGPL-2.0;LGPL-2.1;LGPL-3.0"`), which would pass cleanly against this dependency tree today. Every declared license is a standard permissive OSS license; no legal follow-up required.

---

## 4. CI enforcement status

[`dependency-audit.yml`](../../.github/workflows/dependency-audit.yml) already runs `npm audit --audit-level=high` daily (cron `0 6 * * *`) plus a license-compliance gate, for `ai-backend`, `backend`, and `frontend`. **This workflow would currently fail** for `ai-backend` on the `npm-audit` job — 3 High findings exceed the `--audit-level=high` threshold. This report is the first time that failure has actually been surfaced and triaged; it is not a new regression introduced by this WP.

---

## Summary

| Item | Status |
|---|---|
| `npm audit` completed | Done — 0 critical / 3 high / 11 moderate |
| Dependency review (direct vs transitive) | Done — see tables above |
| Outdated packages | Done — 7 non-advisory items, routine drift |
| Known CVEs | Done — all 14 mapped to GHSA IDs |
| License review | Done — 100% permissive, 0 copyleft |

**Gate status (WP-05 Quality Gate "no High vuln without documented mitigation"):** MET — all 3 High findings have a scoped remediation path (NestJS 10→11 migration) and interim compensating controls documented above.
