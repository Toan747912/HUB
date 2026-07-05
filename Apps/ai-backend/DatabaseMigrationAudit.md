# Database Migration Audit — WP-DB-01 (MongoDB → PostgreSQL/Prisma)

**Date:** 2026-07-05
**Scope:** Complete replacement of MongoDB/Mongoose with Prisma + PostgreSQL (Supabase) across `Apps/ai-backend`.

---

## 1. Purpose

This document is the Phase 0 inventory this migration was executed against, updated with the final as-built state. It lists every Mongoose artifact that existed before the migration and what it became.

## 2. Pre-migration inventory

- 18 Mongoose schema files, 16 repository files injecting `@InjectModel`, 20 test files using `mongodb-memory-server`.
- Every document used an app-generated `String` `_id` (no native `ObjectId`), zero `.populate()`/`.aggregate()` usage, zero `ref:` relations — all cross-aggregate references were already plain string foreign keys.
- Multi-document Mongo transactions (`withTransaction` over `connection.startSession()`) were used for the domain-write + outbox-write atomicity pattern in Goal, Roadmap, Assessment, Recommendation, Skill, and the agent-learning `persistLearningCycle`.
- A naming collision existed: two unrelated Mongoose models (`recommendation/infrastructure/persistence/schemas/recommendation.schema.ts` and `agent-learning/schemas/recommendation.schema.ts`) both targeted Mongo collection `recommendations`.
- `docker-compose.yml` ran a single-node Mongo replica set (`mongo` + `mongo-init` sidecar) purely to satisfy the transaction requirement.

## 3. Schema mapping (Mongoose → Prisma)

| # | Mongo collection | Prisma model | Table | Notes |
|---|---|---|---|---|
| 1 | `goals` | `Goal` | `goals` | Embedded arrays (`versions`, `constraints`, `milestones`) and `progress` → `Json` columns |
| 2 | `roadmaps` | `Roadmap` | `roadmaps` | 3-level nested `phases→milestones→tasks`, `revisions`, `progress`, `goalSnapshot` → `Json` |
| 3 | `assessments` | `Assessment` | `assessments` | `latestResult`, `history` → `Json` |
| 4 | `recommendations` (learner-facing) | `Recommendation` | `recommendations` | `items`, `learningStrategies`, `reviewSchedules`, `priorityDecisions`, `history` → `Json` |
| 5 | `learning_sessions` | `LearningSession` | `learning_sessions` | `activities`, `tasks`, `evidence`, `progress`, `timers`, `history`, `reflection`, `notes` → `Json` |
| 6 | `skills` | `Skill` | `skills` | `aliases`, `metadata` → `Json` |
| 7 | `users` | `User` | `users` | `roles` → `Json` array |
| 8 | `refresh_tokens` | `RefreshToken` | `refresh_tokens` | Flat scalar fields, no change |
| 9 | `api_keys` | `ApiKey` | `api_keys` | `permissions` → `Json` |
| 10 | `audit_events` | `AuditEvent` | `audit_events` | `before`/`after` → `Json` |
| 11 | `outbox_events` | `OutboxEvent` | `outbox_events` | `payload`, `metadata` → `Json` |
| 12 | `agent_memory_records` | `MemoryRecord` | `agent_memory_records` | Compound unique `(scope, scopeId, key)` preserved; `tags` → `Json` |
| 13 | `agent_instances` | `AgentInstance` | `agent_instances` | `completedSteps`, `failedSteps` → `Json` |
| 14 | `agent_messages` | `AgentMessage` | `agent_messages` | `payload`, `metadata` → `Json` |
| 15 | `coordination_plans` | `CoordinationPlan` | `coordination_plans` | Write-once; `agents`, `executionOrder`, etc. → `Json` |
| 16 | `learning_records` | `LearningRecord` | `learning_records` | `experience`, `feedback` → `Json` |
| 17 | `execution_patterns` | `ExecutionPattern` | `execution_patterns` | `evidence` → `Json` |
| 18 | `knowledge_items` | `KnowledgeItem` | `knowledge_items` | `evidence` → `Json` array |
| 19 | `recommendations` (agent-learning) | **`AgentLearningRecommendation`** | `agent_learning_recommendations` | **Naming-collision resolution**: split into its own table/model, distinct from #4 |

**Decision record — embedded documents:** all embedded Mongoose sub-documents/arrays were ported as PostgreSQL `Json` columns rather than normalized child tables (Phase 1 decision, confirmed with stakeholder). Rationale: every nested structure is either an audit-trail array (`history`, `revisions`, `versions` — append-only, never queried by sub-field) or a snapshot copy (`goalSnapshot`), so JSON preserves exact shape and repository/mapper code with minimal churn. No query pattern in the existing codebase filters on a sub-document field. This can be revisited per-field if a future access pattern needs it.

**Decision record — IDs:** every Mongo `_id` was already an app-generated `String` (UUID/ULID from domain code), never a native `ObjectId`. Every Prisma model uses `id String @id` mapped 1:1 to the old `_id` — no ID-format conversion was needed.

**Decision record — TTL:** `agent_memory_records.expiresAt` was never a native Mongo TTL index (no `expireAfterSeconds`); expiry was already enforced by `MemoryGarbageCollectorService`'s `@Interval(60_000)` sweep. This behavior is unchanged — Postgres has an `expiresAt` index and the same interval-based `deleteExpired()` sweep, ported as-is.

## 4. Transaction mapping

Every `withTransaction(connection, async (session) => {...})` call site (Goal/Roadmap/Assessment/Recommendation/Skill command services, `agent-learning`'s `persistLearningCycle`) was replaced with `withTransaction(prisma, async (tx) => {...})`, backed by `prisma.$transaction()`. The domain-write + outbox-insert atomicity guarantee is preserved: both writes happen inside the same Postgres transaction. Removing the Mongo-replica-set requirement (`docker-compose.yml`'s `mongo` + `mongo-init` sidecar) also simplifies local/dev/CI setup — Postgres needs no such workaround for multi-statement transactions.

## 5. Repository migration inventory (16 repositories → 16 Prisma repositories)

| Old file | New file |
|---|---|
| `goal/.../mongo-goal.repository.ts` | `prisma-goal.repository.ts` |
| `roadmap/.../mongo-roadmap.repository.ts` | `prisma-roadmap.repository.ts` |
| `assessment/.../mongo-assessment.repository.ts` | `prisma-assessment.repository.ts` |
| `recommendation/.../mongo-recommendation.repository.ts` | `prisma-recommendation.repository.ts` |
| `skill/.../mongo-skill.repository.ts` | `prisma-skill.repository.ts` |
| `learning-session/.../mongo-learning-session.repository.ts` | `prisma-learning-session.repository.ts` |
| `infrastructure/outbox/outbox.repository.ts` | rewritten in place (Prisma) |
| `infrastructure/security/auth/user.repository.ts` | rewritten in place (Prisma) |
| `infrastructure/security/auth/refresh-token.repository.ts` | rewritten in place (Prisma) |
| `infrastructure/security/api-keys/api-key.repository.ts` | rewritten in place (Prisma) |
| `infrastructure/audit/audit-log.repository.ts` | rewritten in place (Prisma) |
| `agent-memory/.../mongo-memory.repository.ts` | `prisma-memory.repository.ts` |
| `agent-lifecycle/.../mongo-agent-instance.repository.ts` | `prisma-agent-instance.repository.ts` |
| `agent-message-bus/.../mongo-message.repository.ts` | `prisma-message.repository.ts` |
| `agent-coordinator/.../mongo-coordination-plan.repository.ts` | `prisma-coordination-plan.repository.ts` |
| `agent-learning/.../mongo-learning.repository.ts` | `prisma-learning.repository.ts` |

All 16 preserve their exact public method signatures except the one mechanical, repo-wide contract change: `session?: ClientSession` (Mongoose) → `tx?: PrismaTransactionClient` (Prisma), applied identically to `I*Repository.save()` and `IEventPublisher.stage()` across every module that had a transactional write path.

## 6. Verification performed

- `npx tsc -p tsconfig.build.json --noEmit` — clean, zero errors (production code).
- `npx tsc -p tsconfig.test.json --noEmit` — clean, zero errors (production + test code).
- `grep -rl "mongoose\|mongodb-memory-server\|mongodb" src/ --include=*.ts --include=*.json` — zero matches anywhere in source.
- `prisma migrate dev` generated and applied successfully against a real Postgres 16 instance (`prisma/migrations/20260704165742_init/migration.sql`, 19 `CREATE TABLE` statements matching all 19 Prisma models).
- `mongoose`, `@nestjs/mongoose`, `mongodb-memory-server` removed from `package.json`/`package-lock.json`.

## 7. Known follow-ups (not blockers)

- Full `npm test` execution against a live Postgres instance was not completed in this session because Docker Desktop became unreachable mid-session in the development sandbox (unrelated to this change) — see `MigrationReport.md` §6 for details and the exact command to run once available.
- `docker-compose.yml` now runs a local `postgres:16-alpine` service for dev; `docker-compose.production.yml` expects an external `DATABASE_URL` (Supabase) and no longer runs any local DB container.
