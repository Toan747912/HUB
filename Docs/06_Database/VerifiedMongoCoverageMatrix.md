# Verified MongoDB Coverage Matrix (Evidence-Based)

> Companion to [MigrationTestMatrix.md](./MigrationTestMatrix.md) (the unverified target spec). This document replaces the spec's claimed PASS-across-the-board result with an audit backed by file-path evidence read directly from `Apps/ai-backend/src` on 2026-07-03.

## Architectural correction

The spec lists Audit, Outbox, Auth, and API Keys as peer "modules" alongside Goal/Roadmap/Assessment/Recommendation/Skill. They are not domain modules — they live under `infrastructure/` and are consumed *by* the domain modules:

| Claimed module | Actual location |
| --- | --- |
| Audit | `infrastructure/audit/` |
| Outbox | `infrastructure/outbox/` |
| Auth | `infrastructure/security/auth/` |
| API Keys | `infrastructure/security/api-keys/` |

## Verified results

| Module | CRUD (5/5) | Index | Outbox emission | Verdict |
| --- | --- | --- | --- | --- |
| Goal | 4/5 — no filtered `findAll` | ✔ `learnerId`, `{learnerId,status}` | Indirect, via Goal-typed `OutboxPublisherService` | **PARTIAL** |
| Roadmap | 5/5 | ✔ `learnerId`, `{learnerId,status}`, `goalId` | ✔ dedicated `RoadmapOutboxPublisherService` | **PASS** |
| Assessment | 5/5 | ✔ `learnerId`, `{learnerId,status}`, `roadmapId` | ✔ dedicated publisher | **PASS** |
| Recommendation | 5/5 | ✔ `learnerId`, `{learnerId,status}`, `roadmapId` | ✔ dedicated publisher | **PASS** |
| Skill | 3/5 — no delete, filter query is exact-match only | ✔ `skillId`, `normalizedName` (both unique) | ✘ none | **FAIL** |
| Audit | 2/5 — append-only by design (no update/delete/findById) | ✔ `traceId`, `operation`, `resource`, `{resource,timestamp}` | n/a (is the audit sink) | **PASS** (scope-appropriate) |
| Outbox | 3/5 — no `findById`, no delete/retention | ✔ `eventId` (unique), `aggregateId`, `status`, `{status,occurredAt}` | n/a (is the outbox) | **PARTIAL** |
| Auth | 3/5 across User+RefreshToken — no user delete, no token delete/TTL | ✔ `username` (unique), `userId`, `familyId`; ✘ no TTL on `expiresAt` | ✘ bypasses outbox, writes straight to Audit | **PARTIAL** |
| API Keys | 3/5 — no `findById`, no delete (soft-revoke only) | ✔ `keyHash` (unique); ✘ no index on `revokedAt` | ✘ bypasses outbox, writes straight to Audit | **FAIL** |

## Key findings

1. **Skill and API Keys are the real gaps.** Skill has zero outbox/event wiring and no delete method. API Keys has no `findById` and no hard-delete path, and can't be listed/enumerated — only exact-hash lookup.
2. **No writes are transactional.** Every "repository save then outbox save" pair (e.g. Roadmap) is two independent Mongo calls, not wrapped in a session. A crash between them silently drops the outbox event. This directly contradicts the spec's implicit assumption of atomic write+emit.
3. **Auth and API Keys never touch the outbox.** Their side effects (login, token refresh, key issue/revoke) go straight to the Audit log via direct service calls (`AuditLogService.recordSecurityEvent`), swallowed with `.catch(() => undefined)` on failure — so a failed audit write is silently lost.
4. **No repository-layer leaks found.** Repo-wide search for `InjectModel` and raw Mongoose calls (`.find(`, `.updateOne(`, `.aggregate(`, etc.) outside `*repository.ts` files turned up nothing except two unrelated `Array.prototype.find` calls in migration-validator and ai-runtime services — persistence access is consistently isolated to repository classes across all 13 module folders plus infra.
5. **Unbounded growth risk:** `outbox_events`, `refresh_tokens`, and `audit_events` have no TTL indexes or purge jobs.

## Evidence index (file paths cited by the audit)

- Goal: `modules/goal/infrastructure/persistence/repositories/mongo-goal.repository.ts`, `.../schemas/goal.schema.ts`, `application/contracts/goal-repository.contract.ts`, `goal.module.ts`
- Roadmap: `modules/roadmap/infrastructure/persistence/repositories/mongo-roadmap.repository.ts`, `.../schemas/roadmap.schema.ts`, `.../events/roadmap-outbox-publisher.service.ts`
- Assessment: `modules/assessment/infrastructure/persistence/repositories/mongo-assessment.repository.ts`, `.../schemas/assessment.schema.ts`, `.../events/assessment-outbox-publisher.service.ts`
- Recommendation: `modules/recommendation/infrastructure/persistence/repositories/mongo-recommendation.repository.ts`, `.../schemas/recommendation.schema.ts`, `.../events/recommendation-outbox-publisher.service.ts`
- Skill: `modules/skill/infrastructure/persistence/repositories/mongo-skill.repository.ts`, `.../schemas/skill.schema.ts`, `application/contracts/skill-repository.contract.ts`
- Audit: `infrastructure/audit/audit-log.repository.ts`, `audit-event.schema.ts`, `audit-log.service.ts`
- Outbox: `infrastructure/outbox/outbox.repository.ts`, `outbox-event.schema.ts`, `outbox-relay.service.ts`
- Auth: `infrastructure/security/auth/user.repository.ts`, `user.schema.ts`, `refresh-token.repository.ts`, `refresh-token.schema.ts`, `auth.service.ts`
- API Keys: `infrastructure/security/api-keys/api-key.repository.ts`, `api-key.schema.ts`, `api-key.service.ts`

## Status

Audit complete. 3 of 9 items PASS cleanly (Roadmap, Assessment, Recommendation); Audit passes on scope-appropriate grounds; Goal, Outbox, Auth are PARTIAL; Skill and API Keys are FAIL.
