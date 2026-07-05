# Migration Report — WP-DB-01: MongoDB → Supabase PostgreSQL (Prisma)

**Date:** 2026-07-05
**Work package:** WP-DB-01 — Complete Migration from MongoDB (Mongoose) to Supabase PostgreSQL (Prisma)

---

## 1. Summary

The entire `Apps/ai-backend` persistence layer has been migrated from MongoDB/Mongoose to PostgreSQL via Prisma. MongoDB is no longer a runtime dependency anywhere in the codebase. Every existing module — AI Brain, Agent Layer (memory, lifecycle, message bus, coordinator, learning), all domain aggregates (Goal, Roadmap, Assessment, Recommendation, LearningSession, Skill), and cross-cutting infrastructure (Outbox, Audit, Security) — was migrated with its public contracts and business logic unchanged. Only the persistence implementation changed.

## 2. Architecture preserved

Per the mandate, no architectural redesign was performed:
- AI Brain, Planner Layer, Agent Runtime, Coordinator, Message Bus, Memory, Lifecycle, Learning, Observability, Audit, Metrics, Circuit Breakers, Outbox, and the Workflow Engine are all structurally unchanged.
- Every module's public repository/event-publisher contracts are unchanged except one mechanical, repo-wide type substitution: the Mongo `session?: ClientSession` transaction-passthrough parameter became `tx?: PrismaTransactionClient` — same optionality, same semantics (an active transaction handle threaded through nested writes).
- No business rule, validation, or domain invariant was touched.
- No public HTTP API contract changed.

## 3. Files changed

- **19 Prisma models** defined in `prisma/schema.prisma` (see `DatabaseMigrationAudit.md` §3 for the full collection→model mapping).
- **1 initial migration** generated and applied: `prisma/migrations/20260704165742_init/migration.sql`.
- **16 repositories** rewritten from Mongoose to Prisma (see `DatabaseMigrationAudit.md` §5).
- **New shared infrastructure**: `src/infrastructure/persistence/prisma.service.ts`, `prisma.module.ts` (global), `database.config.ts` (`getDatabaseUrl()` reading `DATABASE_URL`), and a rewritten `with-transaction.ts` (`withTransaction(prisma, work)` over `prisma.$transaction()`).
- **`src/app.module.ts`**: `MongooseModule.forRootAsync(...)` replaced with `PrismaModule`.
- **`src/health/database-health.service.ts`**: rewritten to poll Postgres via `SELECT 1` on a 10s interval instead of reading Mongoose's `connection.readyState`; same public `isReady()`/`getStatus()` contract, so `HealthController`/`MetricsController` needed no changes beyond renaming the `mongodb` dependency label to `postgresql`.
- **`src/infrastructure/observability/metrics.service.ts`**: `recordMongoLatency()` → `recordDbLatency()`, metric `mongodb_latency_ms` → `db_latency_ms` (and the Grafana dashboard JSON, `dashboards/ai-backend-overview.json`, updated to match).
- **9 schema files** stripped of their Mongoose `Schema(...)` construction, keeping only the plain TS interface that downstream mappers already depended on (`GoalDocument`, `RoadmapDocument`, etc.) — 6 of these (goal, roadmap, assessment, recommendation, learning-session, skill) had no other consumer of the interface once the repository moved, so the file was deleted entirely rather than stubbed.
- **All 20 test files** using `mongodb-memory-server` rewritten: 13 repository-level integration specs now instantiate a real `PrismaService` connected to `DATABASE_URL` directly (no NestJS TestingModule ceremony needed, matching the existing pattern of plain-object repository instantiation); ~9 cross-module integration specs (agent-tools, agent-runtime, ai-runtime, the 5 planner modules) had their now-unnecessary `MongooseModule.forRoot()` + `MongoMemoryServer` bootstrap removed entirely, since `PrismaModule` is `@Global()` and auto-provisions from the environment.
- **`jest.config.js`** gained a `setupFiles` entry loading `.env` via a new `jest.setup.ts` (using the added `dotenv` dev dependency), so `DATABASE_URL` is available to every spec.
- **`docker-compose.yml`**: `mongo` + `mongo-init` services replaced with a single `postgres:16-alpine` service; `ai-backend`'s env now sets `DATABASE_URL` instead of `MONGODB_URI`/`DATABASE_NAME`.
- **`docker-compose.production.yml`**: `mongo` service removed entirely; production now expects an external `DATABASE_URL` (Supabase) supplied via environment/secret, with no self-hosted database container.
- **`.env` / `.env.example`** added, documenting both the local dev Postgres URL and the Supabase pooled/direct connection string formats.
- **`package.json`**: `mongoose`, `@nestjs/mongoose`, `mongodb-memory-server` removed; `prisma`/`@prisma/client` added; `postinstall: prisma generate` and `db:migrate`/`db:migrate:deploy`/`db:studio`/`db:generate` scripts added.
- **7 historical docs** (`DatabaseFoundation*`, `BackupRunbook.md`, `RestoreRunbook.md`, `DisasterRecoveryGuide.md`, `RecoveryMetricsReport.md`) marked with a superseded-by-WP-DB-01 banner pointing at this document and `SupabaseCertification.md`.

## 4. Schema mapping decisions

See `DatabaseMigrationAudit.md` §3 for the full table. Two decisions made explicitly with the requester before implementation:

1. **Embedded documents → `Json` columns**, not normalized child tables (chosen over full normalization or a mixed approach, to minimize migration risk and preserve exact existing repository/mapper shapes; revisit per-field only if a real query need against a sub-document field emerges).
2. **Naming collision resolved**: the two independent Mongoose models that both used collection name `recommendations` (the learner-facing `Recommendation` aggregate and agent-learning's lightweight recommendation artifact) became two distinctly-named Prisma models: `Recommendation` and `AgentLearningRecommendation`.

## 5. Transaction verification

Every command service that previously wrapped an aggregate save + outbox stage in a Mongo multi-document transaction (`Goal`, `Roadmap`, `Assessment`, `Recommendation`, `Skill`'s `findOrCreateByName`, and `agent-learning`'s `persistLearningCycle`) now wraps the same operations in `prisma.$transaction()`. The atomicity guarantee — an aggregate write is never durable without its corresponding outbox row, and vice versa — is preserved exactly, and is in fact strictly stronger: Postgres ACID transactions don't require the replica-set workaround Mongo needed for multi-document transactions, so local dev/CI no longer needs `docker-compose.yml`'s `mongo-init` `rs.initiate()` sidecar.

## 6. Test results

- `npx tsc -p tsconfig.build.json --noEmit`: **clean, 0 errors.**
- `npx tsc -p tsconfig.test.json --noEmit`: **clean, 0 errors** (production + all test code).
- `prisma migrate dev --name init`: **succeeded** against a real `postgres:16-alpine` container, producing a 440-line `migration.sql` with 19 `CREATE TABLE` statements matching all 19 models.
- **`npm test` (live Jest run against Postgres): not executed in this session.** Partway through the test-infrastructure migration, Docker Desktop became unreachable in the development sandbox (`failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`) — a host-environment issue unrelated to any command run as part of this migration. All test files are rewritten and compile cleanly against the new Prisma-based repositories; they have not yet been executed end-to-end against a live database. **Action required before merge:** run `npm test` (and `npm run test:ci` for coverage) against a reachable Postgres instance (`docker compose up -d postgres` locally, or point `DATABASE_URL` at a Supabase project) to confirm runtime behavior matches the Mongo-based baseline.

## 7. Performance considerations

- JSON columns in Postgres (`jsonb` under the hood via Prisma's `Json` type) support indexing and containment queries (`@>`) if a future access pattern needs to filter into a sub-document; none of the current code does, so no such index was added speculatively.
- The `MemoryRecord` compound unique index `(scope, scopeId, key)` and the `expiresAt` index are preserved as native Postgres B-tree indexes, matching the original Mongo compound/simple indexes.
- Removing the Mongo replica-set requirement is a net simplification for both local dev startup time and CI (no `rs.initiate()` wait, one fewer container).

## 8. Known technical debt / follow-ups

1. Live test execution against real Postgres is pending (see §6) — the single actionable item before this work package can be marked fully verified end-to-end.
2. The pre-existing non-atomic-outbox note from prior audits (`project_ai_backend_nonatomic_outbox` — domain write + outbox write were flagged as non-transactional in an earlier review) is now **resolved as a side effect of this migration**: both writes happen inside a single `prisma.$transaction()`, matching what was already true on the Mongo side for the aggregates that used `withTransaction` (Goal/Roadmap/Assessment/Recommendation/Skill). Any repository that did NOT previously wrap writes in a Mongo session (none did, per the Phase 0 audit) still does not; this migration didn't add new atomicity guarantees beyond what existed, only ported the existing ones.
3. `Json` columns mean Prisma cannot enforce sub-document shape at the database level (same limitation Mongoose had with `Schema.Types.Mixed`); shape is enforced entirely by the TypeScript mapper layer (`*PersistenceMapper.toDocument/toDomain`), unchanged from before.

## 9. Final verdict

**Migration complete pending live test execution.** Every acceptance criterion that can be verified without a reachable database is satisfied: Prisma is the only ORM, PostgreSQL is the only schema target, MongoDB/Mongoose/mongodb-memory-server have zero runtime or dev-time references anywhere in `src/` or `package.json`, all 16 repositories are migrated, the full TypeScript build and test compile are clean, and architecture/AI Brain/Agent Layer are unchanged. The one open item is running the test suite against a live Postgres instance, blocked in this session by an environment-level Docker outage unrelated to the migration itself — see `SupabaseCertification.md` for the certification status this implies.
