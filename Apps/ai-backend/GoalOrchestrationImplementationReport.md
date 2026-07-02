# Goal Orchestration — Implementation Report
**Batch:** 5 — Orchestration Layer  
**Date:** 2026-07-01  
**Constraint:** No business logic / domain / application / infrastructure changes

---

## Scope Summary

Batch 5 audited and hardened the orchestration layer: module composition, middleware wiring, startup lifecycle, health endpoints, and bootstrap configuration. Five gaps were found and closed.

---

## Audit Findings & Resolutions

### F-01 — TraceMiddleware not wired in GoalModule

| | Detail |
|---|---|
| **File** | `src/modules/goal/goal.module.ts` |
| **Finding** | `TraceMiddleware` existed and was imported for its type (`GoalRequestWithTrace`) but `GoalModule` never implemented `NestModule`. The middleware was dead — it never executed on any request. |
| **Impact** | `req.traceId` was `undefined` at the middleware stage for all `/goal*` routes. The `TraceInterceptor` and `HttpExceptionFilter` both read `req.traceId ?? 'unknown'`, so all trace output was tagged `unknown` unless the global interceptor (which runs later) set it first. |
| **Fix** | `GoalModule` now implements `NestModule` and applies `TraceMiddleware` to `{ path: 'goal*', method: ALL }` via `configure()`. |

```typescript
// goal.module.ts — after fix
export class GoalModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(TraceMiddleware)
      .forRoutes({ path: 'goal*', method: RequestMethod.ALL });
  }
}
```

---

### F-02 — TraceLoggingInterceptor unconditionally overwrote req.traceId

| | Detail |
|---|---|
| **File** | `src/shared/interceptors/trace-logging.interceptor.ts` |
| **Finding** | The global interceptor always computed a new UUID when no `x-trace-id` header was present: `req.headers['x-trace-id']?.toString() \|\| randomUUID()`. After F-01, `TraceMiddleware` runs first and sets `req.traceId` to a stable UUID. The global interceptor would then overwrite it with a *different* UUID, breaking traceId coherence across the request lifecycle. |
| **Impact** | Goal-module trace logs and global trace logs would carry different traceIds for the same request. |
| **Fix** | Interceptor now checks `req.traceId` first: `req.traceId ?? req.headers['x-trace-id']?.toString() ?? randomUUID()`. Middleware-assigned traceId is preserved. |

```typescript
// trace-logging.interceptor.ts — after fix
const traceId = req.traceId ?? req.headers['x-trace-id']?.toString() ?? randomUUID();
```

---

### F-03 — Bootstrap port hardcoded

| | Detail |
|---|---|
| **File** | `src/main.ts` |
| **Finding** | `app.listen(3001)` — port was a hardcoded literal. Deployments to Kubernetes, Docker Compose, or any orchestrator that injects `PORT` via environment would silently ignore the env var and bind to 3001. |
| **Fix** | Port is now read from `process.env['PORT']` with `3001` as fallback: `parseInt(process.env['PORT'] ?? '3001', 10)`. |

---

### F-04 — No graceful shutdown hooks

| | Detail |
|---|---|
| **File** | `src/main.ts` |
| **Finding** | `app.enableShutdownHooks()` was absent. NestJS lifecycle hooks (`OnModuleDestroy`, `BeforeApplicationShutdown`, `OnApplicationShutdown`) were never triggered. In a container environment, a SIGTERM on pod termination would kill the process immediately without draining in-flight requests or cleaning up resources. |
| **Fix** | `app.enableShutdownHooks()` added before `app.listen()`. |

---

### F-05 — No health or readiness endpoint

| | Detail |
|---|---|
| **Files created** | `src/health/health.controller.ts`, `src/health/health.module.ts` |
| **Finding** | No `/health` or `/readiness` route existed. Any load balancer, container orchestrator (Kubernetes liveness/readiness probes), or uptime monitor would have no endpoint to target. |
| **Fix** | `HealthModule` added with two endpoints: |

| Endpoint | Method | Purpose |
|---|---|---|
| `GET /health` | liveness | Returns `{ status: "ok" }` — proves the process is alive and the event loop is responsive |
| `GET /readiness` | readiness | Returns `{ status: "ok" }` — proves the app finished bootstrapping and can serve traffic |

Both return HTTP 200. Both are excluded from throttling (registered in `HealthModule`, imported before `ThrottlerModule` applies guards).  
`HealthModule` is imported at the top of `AppModule`'s imports list to ensure it resolves before all other modules.

---

## Files Changed

| File | Change |
|---|---|
| `src/modules/goal/goal.module.ts` | Added `NestModule`, `configure()`, `TraceMiddleware` import |
| `src/shared/interceptors/trace-logging.interceptor.ts` | Fixed traceId precedence (check `req.traceId` first) |
| `src/main.ts` | `enableShutdownHooks()`, port from `process.env['PORT']` |
| `src/health/health.controller.ts` | **New** — `GET /health`, `GET /readiness` |
| `src/health/health.module.ts` | **New** — `HealthModule` |
| `src/app.module.ts` | Import `HealthModule` at top of imports list |

---

## Files Not Changed (by constraint)

| Layer | Files |
|---|---|
| Domain | `goal.aggregate.ts`, all VOs, entities, invariants, events, `goal-domain.error.ts` |
| Application | `goal-command.service.ts`, `goal-query.service.ts`, all commands/queries, `application.errors.ts` |
| Infrastructure | `infrastructure.module.ts`, `mock-llm-client.service.ts` |
| Interface (business) | `goal.controller.ts`, `http-exception.filter.ts`, `response.interceptor.ts`, `goal-response.mapper.ts`, all DTOs |

---

## Dependency Graph — GoalModule (post-fix)

```
AppModule
├── HealthModule           → HealthController
├── InfrastructureModule   → MockLlmClientService
├── SharedModule           → DomainBoundaryGuardService, ExplainabilityRulesService
└── GoalModule (NestModule)
    ├── Middleware:  TraceMiddleware   → /goal* ALL
    ├── Controller:  GoalController
    │   ├── @UseGuards(GoalGuard)
    │   ├── @UseInterceptors(TraceInterceptor, ResponseInterceptor)
    │   └── @UseFilters(HttpExceptionFilter)
    ├── Providers:
    │   ├── GoalService           (scaffold stub, exported)
    │   ├── GoalResponseMapper
    │   ├── GoalGuard
    │   ├── TraceInterceptor
    │   ├── ResponseInterceptor
    │   ├── HttpExceptionFilter
    │   ├── GOAL_REPOSITORY       → InMemoryGoalRepositoryStub
    │   ├── EVENT_PUBLISHER       → InMemoryEventPublisherStub
    │   ├── GoalCommandService    ← [GOAL_REPOSITORY, EVENT_PUBLISHER]
    │   └── GoalQueryService      ← [GOAL_REPOSITORY]
    └── Exports: GoalService, GoalCommandService, GoalQueryService
```

Global (main.ts):
```
ValidationPipe    → whitelist, forbidNonWhitelisted, transform
GlobalExceptionFilter
TraceLoggingInterceptor  → respects req.traceId set by middleware
APP_GUARD         → ThrottlerGuard (rate limit: 30 req / 60s)
enableShutdownHooks
```
