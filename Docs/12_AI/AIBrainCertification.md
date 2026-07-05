# WP-AI-02 — AI Brain Production Hardening Certification

**Scope:** Mission Planner, Discovery Planner, Knowledge Planner, Evidence Planner, Teaching Planner, `BasePlannerService`, and the shared AI Brain infrastructure (`infrastructure/ai-brain/`, `infrastructure/observability/`, `infrastructure/audit/`, `infrastructure/resilience/`).
**Reviewed against:** `Apps/ai-backend/src` working tree, 2026-07-04.
**Constraint honored throughout:** no architecture redesign, no new planners/modules, no prompt/planner-logic/endpoint/controller changes. This certification covers production-hardening changes only.

---

## Certification Scope

This certification applies **only** to the planner architecture:

- `BasePlannerService`
- Mission Planner
- Discovery Planner
- Knowledge Planner
- Evidence Planner
- Teaching Planner
- Planner execution pipeline (context assembly → `ResilientLlmGateway` → response build → explainability validation → observability emission)
- Planner observability (structured logging via `StructuredLoggerService.logPlannerExecution()`)
- Planner explainability (`ExplainabilityRulesService.validate()`)
- Planner metrics (`recordPlannerOutcome()`, `circuit_breaker_open_total`)
- Planner contract compliance (`planner-contract-audit.ts`, 35/35 checks)

**Explicitly out of scope** (not reviewed, not audited, not covered by any PASS/FAIL statement in this document):

- Legacy `AiRuntimeService` execution path (non-planner routes: `goal`, `roadmap`, `learning_session`, etc.)
- Agent Runtime
- Agent Layer
- Tool Framework
- Memory Framework
- Lifecycle Framework

Every finding, pass, or fail stated in the sections below applies to the in-scope planner architecture only, unless a section explicitly names an out-of-scope item as technical debt (see **Known Technical Debt**).

## 1. Architecture

Unchanged from the frozen design: five planners extend `BasePlannerService<TRequest, TResponse>`, which owns the shared pipeline (assemble context → call `ResilientLlmGateway` → build response → validate explainability → emit log/metrics/audit). `planner-contract-audit.ts` (Phase 4) confirms all five still extend the base class and follow the same shape — **PASS**.

One pre-existing architectural gap, outside the Certification Scope defined above, is documented in `LLMUsageAudit.md`: `AiRuntimeService`'s legacy non-planner routes (`goal`, `roadmap`, `learning_session`, etc.) call `MockLlmClientService` directly with an in-memory circuit breaker, bypassing `ResilientLlmGateway`/`RedisCircuitBreakerService`. This predates and is architecturally independent of the five AI Brain planners — tracked as **Known Technical Debt**, not a planner-scope finding.

## 2. Observability — Logging

**Before:** `BasePlannerService.emitObservability()` called `console.log` directly, bypassing `StructuredLoggerService` entirely. Per-planner `buildLogFields()` inconsistently logged only 2 of the 3 identity fields (`userId`/`goalId`/`sessionId`) per planner.

**After (Phase 1):**
- Added `StructuredLoggerService.logPlannerExecution()` (`Apps/ai-backend/src/infrastructure/observability/structured-logger.service.ts`) as the single sink for planner execution logs.
- `BasePlannerService` (`base-planner.service.ts`) now calls it with every required field: `traceId`, `userId`, `goalId`, `sessionId` (read directly from the request, guaranteeing all three are always present — not delegated to the removed, inconsistent `buildLogFields()` hook), `capability`, `operation`, `provider`, `model`, `promptVersion`, `fallbackUsed`, `latencyMs`, `confidence`, `status`, `errorType`.
- The dead `buildLogFields()` abstract hook was removed from `BasePlannerService` and all five planners, since nothing calls it anymore.
- No raw `console.log`/`console.error` remains anywhere under `infrastructure/ai-brain/` or the five planner service files. (`StructuredLoggerService` itself still bottoms out at `console.log`/`console.error` internally — that is its role as the log transport, not a bypass of it.)

**Status: PASS.**

## 3. Confidence Standardization

Audited every confidence value in the codebase (see `ConfidenceStandardization.md`). Found two representations: the live raw `number` in `[0,1]` used everywhere (planner responses, `ExplainabilityRulesService`, `MetricsService`, recommendation/assessment engines), and a dead, zero-importer `Confidence` value object on an incompatible `0–100` scale.

**Decision:** canonical representation is raw `number` in `[0,1]`. Deleted the unused VO (`shared/domain/vocabulary/confidence.vo.ts`) rather than adopt it, since nothing consumed its scale and migrating the live pipeline to it would be a scope-violating behavior change for zero benefit. No adapter was needed. No API/contract shape changed.

**Status: PASS — single representation confirmed, no dual representation remains.**

## 4. Metrics — Planner Health

**Before:** each planner had its own three hardcoded metrics (`increment*PlanGenerated`, `increment*PlanFallbackUsed`, `record*PlanConfidence`) with no shared success/failure/timeout/circuit-breaker-open tracking, and no latency histogram (so no P95).

**After (Phase 3, additive only — existing per-planner metrics and their tests are untouched):**
- `MetricsService.recordPlannerOutcome()` — new generic, capability-labeled metric family in `metrics.service.ts`:
  - `planner_execution_total{capability,status}` — source for success rate / failure rate (`rate(...{status="SUCCESS"}) / rate(...)`).
  - `planner_fallback_total{capability}` — source for fallback rate.
  - `planner_latency_ms{capability}` (Histogram) — source for average and P95 latency (`histogram_quantile(0.95, ...)`).
  - `planner_confidence_average{capability}` (Gauge, running sum/count per capability).
  - `planner_llm_timeout_total{capability}` — incremented when the gateway's fallback reason is `llm_unavailable_or_timeout`.
- `circuit_breaker_open_total{job}` — new counter, incremented in `RedisCircuitBreakerService.setCircuitBreakerState` at every transition to `OPEN` (existing threshold/cooldown logic untouched).
- Called centrally from `BasePlannerService.emitObservability()` via defensive optional chaining (`this.metrics?.recordPlannerOutcome?.(...)`), so it cannot affect planners whose test doubles don't implement it.

**Status: PASS.**

## 5. Explainability

`ExplainabilityRulesService.validate()` is unchanged and still called from `BasePlannerService.execute()` before every response is returned. `planner-contract-audit.ts`'s `VALIDATES_EXPLAINABILITY` check (inherited via `BasePlannerService`, no planner overrides `execute()`) — **PASS for all 5 planners**.

## 6. Runtime Integration

`AiRuntimeService` dispatch to the five planner capabilities (`isPlannerCapability` → `dispatchToPlanner`) is unchanged. No endpoint, controller, or DTO was modified. **PASS**, with the pre-existing legacy-path gap noted in Section 1 / **Known Technical Debt** below / `LLMUsageAudit.md`.

## 7. Atomic Outbox / Persistence Compatibility

Not touched by this WP. `BasePlannerService.emitObservability()`'s audit-emission call (`auditLog.recordSecurityEvent(...)`) is unchanged in shape and position in the pipeline. **PASS (unaffected)**.

## 8. Failure Handling & Circuit Breakers

`ResilientLlmGateway` and `RedisCircuitBreakerService` logic (thresholds, cooldowns, breaker keys) are unchanged — the only addition is the new `circuit_breaker_open_total` counter alongside the existing `setCircuitBreakerState` gauge update, at the same call site. **PASS**.

## 9. Planner Consistency

`planner-contract-audit.ts` (Phase 4) — manual command `npm run audit:planner-contract`, output at `Docs/12_AI/PlannerContractReport.md`:

**35/35 checks passed across all 5 planners** — every planner extends `BasePlannerService`, exposes `promptVersion` and `capability`, validates explainability, emits metrics, emits audit events, and uses `ResilientLlmGateway`.

## 10. Test Verification

- `npm run typecheck` — clean, no errors.
- `npx jest --config jest.config.js` (full suite) — **74/74 test suites, 444/444 tests passed.** No existing planner, ai-runtime, observability, or resilience test needed modification; all new wiring (structured logger, metrics) is additive and defensively optional-chained.

## Known Technical Debt

The following is tracked as known technical debt. It is **not** a certification finding, because it falls entirely outside the Certification Scope defined above.

**`AiRuntimeService` legacy non-planner routes** (`goal`, `roadmap`, `learning_session`, etc.) call `MockLlmClientService` directly, with a separate in-memory circuit breaker, bypassing `ResilientLlmGateway` and `RedisCircuitBreakerService` (see `LLMUsageAudit.md`).

- **Does not invalidate this certification.** The legacy runtime path was never part of the certified planner architecture — it predates the five AI Brain planners and is architecturally independent of `BasePlannerService`. Nothing in this document certifies the legacy path as passing; it is explicitly excluded.
- **Is documented for a future work package.** Migrating `AiRuntimeService`'s legacy routes onto `ResilientLlmGateway` is recommended as the next WP, so that "no direct LLM calls outside the gateway" holds for the codebase as a whole and not just the planner surface.
- **Is intentionally excluded from certification scope.** This WP's constraint ("no architecture redesign, no new planners/modules") precluded touching the legacy runtime. It is recorded here rather than silently omitted, to preserve the audit trail and historical accuracy of what was and wasn't reviewed.

The newly scaffolded Agent Runtime / Agent Layer / Tool Framework / Memory Framework / Lifecycle Framework modules are likewise out of scope and unreviewed — they are not technical debt relative to this WP, simply not yet built out or certified.

---

## Overall Certification: **PASS (Planner Scope)**

The five AI Brain planners and their shared `BasePlannerService` pipeline are fully hardened per this work package, within the Certification Scope defined above: structured logging replaces the one raw `console.log` in the AI Brain surface, confidence has a single canonical representation with the dead VO removed, planner health metrics are now exposed per capability (success/failure/fallback rate, latency + P95, average confidence, LLM timeout count, circuit-breaker-open count), a repeatable contract-verification tool exists (35/35 checks passed), and a full architecture audit found the planner surface has zero direct LLM calls outside `ResilientLlmGateway`.

This is a scoped pass, not a whole-codebase pass. The pre-existing `AiRuntimeService` legacy-route gap documented in **Known Technical Debt** above is real and unresolved, but it sits entirely outside the planner architecture this WP certifies — it does not weaken any claim made about the five planners. Upgrading from CONDITIONAL PASS to PASS (Planner Scope) reflects that the scope is now explicit and the legacy gap is classified as out-of-scope technical debt rather than an open condition on the planner certification itself. It is not a claim that the legacy gap has been fixed or that it is no longer a problem — see Known Technical Debt for the follow-up recommendation.

## Files Modified

- `Apps/ai-backend/src/infrastructure/observability/structured-logger.service.ts` — added `PlannerExecutionLogEntry`/`logPlannerExecution()`.
- `Apps/ai-backend/src/infrastructure/ai-brain/base-planner.service.ts` — structured logging, planner-outcome metrics, removed dead `buildLogFields` hook.
- `Apps/ai-backend/src/modules/{mission,discovery,knowledge,evidence,teaching}-planner/application/services/*.service.ts` — threaded `StructuredLoggerService` into `super()`, removed dead `buildLogFields()` override.
- `Apps/ai-backend/src/infrastructure/observability/metrics.service.ts` — added `recordPlannerOutcome()`, `circuit_breaker_open_total`.
- `Apps/ai-backend/src/infrastructure/resilience/redis-circuit-breaker.service.ts` — increment `circuit_breaker_open_total` on OPEN transition.
- `Apps/ai-backend/src/shared/domain/vocabulary/confidence.vo.ts` — **deleted** (dead code, zero importers).
- `Apps/ai-backend/scripts/planner-contract-audit.ts` — **new**, Phase 4 verification tool.
- `Apps/ai-backend/package.json` — added `audit:planner-contract` script.
- `Docs/12_AI/ConfidenceStandardization.md`, `Docs/12_AI/LLMUsageAudit.md`, `Docs/12_AI/PlannerContractReport.md`, `Docs/12_AI/AIBrainCertification.md` — new documentation deliverables.

## Tests Executed

- `npm run typecheck` — PASS.
- `npx jest --config jest.config.js` (full suite, 74 suites / 444 tests) — PASS, no test modifications required.

## Metrics Added

- `planner_execution_total{capability,status}`, `planner_fallback_total{capability}`, `planner_llm_timeout_total{capability}`, `planner_latency_ms{capability}` (Histogram), `planner_confidence_average{capability}` (Gauge), `circuit_breaker_open_total{job}`.

## Audit Results

- `Docs/12_AI/PlannerContractReport.md` — 35/35 checks PASS across 5 planners.
- `Docs/12_AI/LLMUsageAudit.md` — planner surface PASS; one legacy non-planner FAIL (out of scope, documented).

## Certification Decision

**PASS (Planner Scope)** — the planner architecture defined in Certification Scope (`BasePlannerService` and the five planners, their execution pipeline, observability, explainability, metrics, and contract compliance) is fully hardened and passes with no open conditions within that scope. The pre-existing `AiRuntimeService` legacy-route gap is real, unresolved, and documented as Known Technical Debt for a follow-up work package, but it is out of scope for this certification and does not condition the result above.
