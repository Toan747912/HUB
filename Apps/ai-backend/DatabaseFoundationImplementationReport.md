# Database Foundation — Implementation Report

> **HISTORICAL — SUPERSEDED BY WP-DB-01.** This document describes the original MongoDB/Mongoose persistence design.
> As of WP-DB-01, the canonical persistence platform is **Prisma + PostgreSQL (Supabase)**; MongoDB is no longer a
> runtime dependency. Kept for historical reference only. See DatabaseMigrationAudit.md, MigrationReport.md, and
> SupabaseCertification.md for the current state.

**Batch:** 6 — Database Foundation (Production Persistence Layer)  
**Date:** 2026-07-01  
**Strategy:** MongoDB + Mongoose  
**Classification:** READY_FOR_PRODUCTION_PERSISTENCE

---

## Objective

Replace `InMemoryGoalRepositoryStub` with a production-grade MongoDB repository adapter while preserving domain purity, application contracts, API contracts, error envelopes, trace propagation, and Clean Architecture boundaries.

---

## Architecture

```
Goal Aggregate (Domain)
        ↓
IGoalRepository (Application Contract)
        ↓
MongoGoalRepository (Infrastructure Adapter)
        ↓
GoalPersistenceMapper (Infrastructure Mapper)
        ↓
Mongoose Model / GoalSchema
        ↓
MongoDB
```

No Mongoose type leaks into Domain or Application layers.

---

## Files Created

### Infrastructure / Persistence

| File | Purpose |
|---|---|
| `src/modules/goal/infrastructure/persistence/config/database.config.ts` | `MONGODB_URI` + `DATABASE_NAME` env resolvers; throws on missing URI (fail-fast) |
| `src/modules/goal/infrastructure/persistence/documents/goal.document.ts` | Pure TypeScript interface for MongoDB document shape |
| `src/modules/goal/infrastructure/persistence/schemas/goal.schema.ts` | Mongoose Schema — no domain imports |
| `src/modules/goal/infrastructure/persistence/mappers/goal-persistence.mapper.ts` | Bidirectional mapper: `Goal Aggregate ↔ GoalDocument` |
| `src/modules/goal/infrastructure/persistence/repositories/mongo-goal.repository.ts` | `MongoGoalRepository implements IGoalRepository` |

### Tests

| File | Purpose |
|---|---|
| `src/modules/goal/infrastructure/persistence/repositories/__tests__/mongo-goal.repository.spec.ts` | 9 integration tests using `mongodb-memory-server` |

### Configuration

| File | Purpose |
|---|---|
| `jest.config.js` | Jest configuration with `ts-jest` and 300s timeout |
| `tsconfig.test.json` | CommonJS module resolution for test runner |

### Updated Files

| File | Change |
|---|---|
| `src/modules/goal/goal.module.ts` | Imports `MongooseModule.forFeature`, provides `MongoGoalRepository` as `GOAL_REPOSITORY` |
| `src/app.module.ts` | Adds `MongooseModule.forRootAsync()` with structured connection logging |
| `src/health/health.controller.ts` | `/readiness` now checks DB connection state (200 / 503) |
| `src/health/health.module.ts` | Imports `MongooseModule` for `@InjectConnection()` in `DatabaseHealthService` |
| `src/health/database-health.service.ts` | **New** — wraps `Connection.readyState` with typed status |
| `package.json` | Added `@nestjs/mongoose`, `mongoose`; added `jest`, `ts-jest`, `@nestjs/testing`, `mongodb-memory-server` |

---

## Domain Boundary Preservation

**No domain or application files were modified.**

The reconstitution pattern used in `GoalPersistenceMapper.toDomain()` works via runtime property assignment (`(goal as any).field = value`). TypeScript `private` is a compile-time constraint only — there are no private slots in JavaScript. This is the accepted pattern for aggregate reconstitution when the domain has no static `reconstruct()` factory.

```typescript
// goal-persistence.mapper.ts — reconstitution pattern
static toDomain(doc: GoalDocument): Goal {
  const goal = Object.create(Goal.prototype) as Goal;
  (goal as any).goalId = doc._id;
  (goal as any).learnerId = doc.learnerId;
  (goal as any).status = GoalStatus.create(doc.status);
  (goal as any).aggregateVersion = doc.aggregateVersion;
  (goal as any).pendingEvents = [];
  // ... all remaining private fields
  return goal;
}
```

---

## Schema Design

```
goals collection
├── _id           String (= goalId UUID)
├── learnerId     String [indexed]
├── status        String
├── aggregateVersion  Number
├── versions[]
│   ├── version   Number
│   ├── title, description   String
│   ├── type, difficulty, priority   String
│   └── targetDate, createdAt  Date
├── constraints[]
│   ├── id, type, value   String
│   ├── active            Boolean
│   └── createdAt         Date
├── milestones[]
│   ├── id, title   String
│   ├── reached     Boolean
│   └── reachedAt   Date (optional)
├── progress
│   ├── completionRatio        Number
│   ├── reachedMilestoneIds    String[]
│   └── updatedAt              Date
├── createdAt     Date (Mongoose timestamps)
└── updatedAt     Date (Mongoose timestamps)

Indexes: { learnerId: 1, status: 1 }
```

---

## Mapping Rules

| Field | Direction | Note |
|---|---|---|
| `goalId` | Aggregate → `_id` | String UUID used as document key |
| `learnerId` | Private field → `learnerId` | Accessed via runtime cast |
| `status` | `getStatus()` → string | Restored via `GoalStatus.create()` |
| `aggregateVersion` | `getAggregateVersion()` → number | Restored directly |
| `versions[]` | `getVersions()` → array | VOs reconstructed via `GoalVersion` constructor |
| `constraints[]` | `getConstraints()` → array | `GoalConstraint` reconstructed from fields |
| `milestones[]` | `getMilestones()` → array | `GoalMilestone` reconstructed from fields |
| `progress` | `getProgress()` → object | `GoalProgress` reconstructed with all 3 fields |
| `pendingEvents` | Always `[]` on reconstitution | Events are not persisted (fire-and-forget) |

---

## Save Strategy

```typescript
// Upsert: insert on first save, update on subsequent saves
await this.model.findByIdAndUpdate(
  _id,
  {
    $set: { ...mutableFields, updatedAt: new Date() },
    $setOnInsert: { createdAt: new Date() }
  },
  { upsert: true, returnDocument: 'after' }
);
```

`createdAt` is only written on insert (`$setOnInsert`). Subsequent saves only update mutable fields + `updatedAt`.

---

## Health Integration

```
GET /readiness

Connected   → HTTP 200  { status: "ok", checks: { database: "connected" } }
Disconnected → HTTP 503  { status: "unavailable", checks: { database: "disconnected" } }
```

`DatabaseHealthService` wraps `mongoose.Connection.readyState` (0=disconnected, 1=connected, 2=connecting, 3=disconnecting).

---

## Fail-Fast Bootstrap

```typescript
// database.config.ts
export function getDatabaseUri(): string {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is required. Application cannot start without a database connection.');
  }
  return uri;
}
```

Called in `MongooseModule.forRootAsync({ useFactory: () => ({ uri: getDatabaseUri() }) })`. If `MONGODB_URI` is absent, bootstrap throws before the app binds to any port.

---

## Structured Logging

Every repository operation emits:

```json
{
  "traceId": "db",
  "operation": "save | findById | findAll | delete",
  "aggregateId": "<goalId>",
  "latencyMs": 25,
  "database": "mongodb",
  "status": "SUCCESS | FAILURE",
  "errorType": "ErrorClassName"
}
```

---

## Runtime Evidence

Test run: `npx jest --config jest.config.js --verbose --forceExit`  
Result: **9 passed / 0 failed** in **6.438 seconds**

Structured log output captured from test run:

```json
{"traceId":"db","operation":"save","aggregateId":"goal-t01","latencyMs":25,"database":"mongodb","status":"SUCCESS"}
{"traceId":"db","operation":"findById","aggregateId":"goal-t01","latencyMs":4,"database":"mongodb","status":"SUCCESS"}
{"traceId":"db","operation":"findById","aggregateId":"does-not-exist","latencyMs":2,"database":"mongodb","status":"SUCCESS"}
{"traceId":"db","operation":"save","aggregateId":"goal-t03","latencyMs":4,"database":"mongodb","status":"SUCCESS"}
{"traceId":"db","operation":"findById","aggregateId":"goal-t03","latencyMs":1,"database":"mongodb","status":"SUCCESS"}
{"traceId":"db","operation":"save","aggregateId":"goal-t04","latencyMs":3,"database":"mongodb","status":"SUCCESS"}
{"traceId":"db","operation":"delete","aggregateId":"goal-t04","latencyMs":2,"database":"mongodb","status":"SUCCESS"}
{"traceId":"db","operation":"findById","aggregateId":"goal-t04","latencyMs":2,"database":"mongodb","status":"SUCCESS"}
{"traceId":"db","operation":"save","aggregateId":"goal-t05","latencyMs":3,"database":"mongodb","status":"SUCCESS"}
{"traceId":"db","operation":"findById","aggregateId":"goal-t05","latencyMs":1,"database":"mongodb","status":"SUCCESS"}
{"traceId":"db","operation":"save","aggregateId":"goal-t06","latencyMs":4,"database":"mongodb","status":"SUCCESS"}
{"traceId":"db","operation":"findById","aggregateId":"goal-t06","latencyMs":2,"database":"mongodb","status":"SUCCESS"}
{"traceId":"db","operation":"findAll","aggregateId":"*","latencyMs":2,"database":"mongodb","status":"SUCCESS"}
{"traceId":"db","operation":"save","aggregateId":"goal-a","latencyMs":2,"database":"mongodb","status":"SUCCESS"}
{"traceId":"db","operation":"save","aggregateId":"goal-b","latencyMs":2,"database":"mongodb","status":"SUCCESS"}
{"traceId":"db","operation":"save","aggregateId":"goal-c","latencyMs":3,"database":"mongodb","status":"SUCCESS"}
{"traceId":"db","operation":"findAll","aggregateId":"*","latencyMs":1,"database":"mongodb","status":"SUCCESS"}
{"traceId":"db","operation":"save","aggregateId":"fault-goal","latencyMs":0,"database":"mongodb","status":"FAILURE","errorType":"Error"}
{"traceId":"db","operation":"findById","aggregateId":"x","latencyMs":0,"database":"mongodb","status":"FAILURE","errorType":"Error"}
{"traceId":"db","operation":"findAll","aggregateId":"*","latencyMs":0,"database":"mongodb","status":"FAILURE","errorType":"Error"}
{"traceId":"db","operation":"delete","aggregateId":"x","latencyMs":0,"database":"mongodb","status":"FAILURE","errorType":"Error"}
```
