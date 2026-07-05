# Database Foundation — Certification Checklist

> **HISTORICAL — SUPERSEDED BY WP-DB-01.** This document describes the original MongoDB/Mongoose persistence design.
> As of WP-DB-01, the canonical persistence platform is **Prisma + PostgreSQL (Supabase)**; MongoDB is no longer a
> runtime dependency. Kept for historical reference only. See DatabaseMigrationAudit.md, MigrationReport.md, and
> SupabaseCertification.md for the current state.

**Batch:** 6 — Database Foundation  
**Date:** 2026-07-01  
**Runtime Evidence:** 9/9 tests PASS

---

## 1. Required Tests (Spec Mandated)

| Test ID | Name | Status | Evidence |
|---|---|---|---|
| T01 | Create Goal — saved and retrievable | **PASS** | `save(goal-t01)` SUCCESS; `findById` returns non-null aggregate with correct status and version |
| T02 | Read Goal — missing goal returns null | **PASS** | `findById('does-not-exist')` → `null` |
| T03 | Update Goal — state transition persisted | **PASS** | `transitionTo('ACTIVE')` → `save` → `findById` → `status === 'ACTIVE'`, `aggregateVersion === 2` |
| T04 | Delete Goal — hard delete removes document | **PASS** | `save` → `delete` → `findById` → `null` |
| T05 | Version preservation — `aggregateVersion` exact round-trip | **PASS** | Version 2 stored, reloaded as 2; OL check with wrong version throws |
| T06 | Persistence restart survival — full aggregate state | **PASS** | `learnerId`, `status`, `milestones[]`, `versions[]` all restored identically |
| T07 | Missing Goal / empty collection | **PASS** | `findAll()` on empty collection → `[]`; after 3 inserts → 3 goals with correct IDs |
| T08 | Connection failure handling — repository propagates errors | **PASS** | All 4 methods throw `'DB_FAULT'` when model rejects; structured FAILURE logs emitted |

**8 scenarios (9 total test cases) — 9/9 PASS**

---

## 2. Mapping Integrity

| # | Check | Status | Evidence |
|---|---|---|---|
| 2.1 | `goalId` → `_id` round-trip | PASS | T01, T06 |
| 2.2 | `learnerId` preserved | PASS | T06: `(loaded as any).learnerId === 'learner-99'` |
| 2.3 | `status` preserved as string | PASS | T03: `DRAFT → ACTIVE` persisted correctly |
| 2.4 | `aggregateVersion` exact | PASS | T05: version `2` restored as `2` |
| 2.5 | `versions[]` array preserved | PASS | T06: `getVersions().length === 1` |
| 2.6 | `milestones[]` array preserved | PASS | T06: milestone title, `reached: false` restored |
| 2.7 | `constraints[]` default empty | PASS | No constraints set in tests; default `[]` |
| 2.8 | `progress.completionRatio` default | PASS | Initial `GoalProgress(0, [])` preserved |
| 2.9 | `pendingEvents` always `[]` on reload | PASS | Events are transient; not persisted |
| 2.10 | VOs reconstructed correctly (GoalStatus, GoalType, etc.) | PASS | `transitionTo` works post-reload (T03) |

---

## 3. Schema Compliance

| # | Check | Status |
|---|---|---|
| 3.1 | Collection name is `goals` | PASS |
| 3.2 | `_id` is String (not ObjectId) | PASS |
| 3.3 | `timestamps: true` (createdAt / updatedAt auto-managed) | PASS |
| 3.4 | Compound index on `{ learnerId, status }` | PASS |
| 3.5 | No Mongoose `Document` type leaks into Domain or Application | PASS |
| 3.6 | `$setOnInsert: { createdAt }` — `createdAt` not overwritten on update | PASS |

---

## 4. Domain Boundary

| # | Check | Status | Evidence |
|---|---|---|---|
| 4.1 | `goal.aggregate.ts` unmodified | PASS | No domain file touched |
| 4.2 | `goal-domain.error.ts` unmodified | PASS | No domain file touched |
| 4.3 | All invariants intact | PASS | T05: OL violation still throws |
| 4.4 | `IGoalRepository` contract unchanged | PASS | `MongoGoalRepository` implements existing interface |
| 4.5 | Application services untouched | PASS | `goal-command.service.ts`, `goal-query.service.ts` not modified |
| 4.6 | Controller contracts unchanged | PASS | `goal.controller.ts` not modified |
| 4.7 | Error envelopes unchanged | PASS | `http-exception.filter.ts` not modified |

---

## 5. Bootstrap & Configuration

| # | Check | Status |
|---|---|---|
| 5.1 | `MONGODB_URI` missing → bootstrap throws | PASS |
| 5.2 | `DATABASE_NAME` optional, defaults to `ai-backend` | PASS |
| 5.3 | `MongooseModule.forRootAsync()` in `AppModule` | PASS |
| 5.4 | Connection lifecycle events logged (connected / error / disconnected) | PASS |
| 5.5 | `MongooseModule.forFeature([{ name: 'Goal', schema: GoalSchema }])` in `GoalModule` | PASS |

---

## 6. Health Integration

| # | Check | Status | HTTP |
|---|---|---|---|
| 6.1 | `GET /readiness` — connected | PASS | 200 |
| 6.2 | `GET /readiness` — disconnected | PASS | 503 |
| 6.3 | Response body has `checks.database` field | PASS | — |
| 6.4 | `GET /health` unchanged (liveness only) | PASS | 200 |

---

## 7. Observability

| # | Check | Status |
|---|---|---|
| 7.1 | Every `save` emits structured JSON log | PASS |
| 7.2 | Every `findById` emits structured JSON log | PASS |
| 7.3 | Every `findAll` emits structured JSON log | PASS |
| 7.4 | Every `delete` emits structured JSON log | PASS |
| 7.5 | Log includes `traceId`, `operation`, `aggregateId`, `latencyMs`, `database`, `status` | PASS |
| 7.6 | Log includes `errorType` on FAILURE | PASS |

---

## 8. Test Infrastructure

| # | Check | Status |
|---|---|---|
| 8.1 | `mongodb-memory-server` used (no external MongoDB required) | PASS |
| 8.2 | `beforeAll` starts fresh server per suite | PASS |
| 8.3 | `afterEach` clears collection between tests | PASS |
| 8.4 | `afterAll` disconnects Mongoose and stops server | PASS |
| 8.5 | `jest.setTimeout(300_000)` prevents binary-download timeout on first run | PASS |
| 8.6 | `--forceExit` handles lingering Mongoose connections | PASS |

---

## Certification Summary

| Section | Checks | Passed | Failed |
|---|---|---|---|
| 1. Required Tests | 9 (tests) | 9 | 0 |
| 2. Mapping Integrity | 10 | 10 | 0 |
| 3. Schema Compliance | 6 | 6 | 0 |
| 4. Domain Boundary | 7 | 7 | 0 |
| 5. Bootstrap & Config | 5 | 5 | 0 |
| 6. Health Integration | 4 | 4 | 0 |
| 7. Observability | 6 | 6 | 0 |
| 8. Test Infrastructure | 6 | 6 | 0 |
| **Total** | **53** | **53** | **0** |

**Certification: PASS — 53/53 checks green, 9/9 runtime tests pass.**
