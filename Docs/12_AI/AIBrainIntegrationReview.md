# WP-AI-02 — AI Brain Integration Review

**Type:** Architecture review only (no code changed as part of this document)
**Scope:** Mission Planner, Discovery Planner, Knowledge Planner, Evidence Planner, Teaching Planner, and the shared AI Brain infrastructure they depend on (`infrastructure/ai-brain/`, `infrastructure/observability/`, `infrastructure/audit/`, `shared/services/explainability-rules.service.ts`).
**Reviewed against:** `Apps/ai-backend/src` as of commit `5a3552f` (working tree), 2026-07-04.

---

## Executive Summary

The five planners (Mission, Discovery, Knowledge, Evidence, Teaching) are **internally consistent to the point of being byte-for-byte structural clones** of one template — same constructor shape, same try/catch flow, same fallback rules, same observability calls, same normalization helpers. This is a genuine strength: there is exactly one pattern to learn, and it is followed without drift anywhere in the five services.

The critical finding is that **none of the five planners are reachable from outside their own module.** No controller, cron job, orchestration hook, or the pre-existing `AiRuntimeController` (`/ai/execute`) invokes any of them. They are fully built, fully tested in isolation, and completely disconnected from anything a client, scheduler, or agent could call. A parallel, older system (`AiRuntimeService`) already exposes an HTTP surface with its own — structurally different — resilience, explainability, and normalization logic, and does not know the five new planners exist.

Because the five planners are template clones, most "consistency" categories below score well by construction. But that same cloning is the technical debt: five copies of ~130 lines of near-identical control flow, normalization, and observability code exist with no shared base, so every future fix (e.g. a change to the fallback confidence constant, or to what `emitObservability` logs) has to be applied five times by hand, and nothing prevents the copies from silently diverging over time the way `AiRuntimeService` already has.

**Overall score: 6.5 / 10 — CONDITIONAL PASS.** The code that exists is clean, safe, and well-tested. It should not ship, demo, or be scheduled for further planner work until the wiring gap (no controller/consumer) and the duplication debt (no shared base class) are addressed.

---

## Architecture Overview

```
AppModule
 ├─ AiRuntimeModule            (pre-existing, HTTP-exposed via POST /ai/execute)
 │   └─ AiRuntimeService       — own inline circuit breaker, own explainability call,
 │                                own confidence/traced_to normalization, route switch
 │                                over goal/roadmap/learning_session/knowledge/evidence/
 │                                assessment/recommendation/discovery/teaching
 │
 ├─ MissionPlannerModule    ─┐
 ├─ DiscoveryPlannerModule   │  Each: imports AiBrainModule + TelemetryModule + AuditModule
 ├─ KnowledgePlannerModule   │─ + SharedModule; provides & exports exactly one *PlannerService.
 ├─ EvidencePlannerModule    │  No controller in any of the five modules.
 └─ TeachingPlannerModule   ─┘
       each *PlannerService depends on:
         ContextAssemblyService (from AiBrainModule)
         ResilientLlmGateway    (from AiBrainModule)
         ExplainabilityRulesService (from SharedModule)
         MetricsService?  (optional, from TelemetryModule)
         AuditLogService? (optional, from AuditModule)
       each *PlannerService owns:
         a local `fallbackEngine = new *PlanningEngine()`   (deterministic, no DI)
         buildFallbackResponse / buildLlmResponse / normalize* / emitObservability

AiBrainModule (infrastructure/ai-brain/)
 ├─ ContextAssemblyService.assemble() — Promise.all over Goal/Roadmap/LearningSession/
 │   Recommendation/Discovery/Assessment services → single BrainContext
 └─ ResilientLlmGateway.complete() — 8s timeout + Redis circuit breaker keyed by
     `capability:provider`, wraps MockLlmClientService, never throws (returns
     fallbackUsed:true instead)
```

Each planner's request flow is identical:
`assemble context → build prompt → gateway.complete() → (fallback engine | normalize LLM JSON) → explainabilityRules.validate() → emitObservability() (console.log + metrics + audit) → return`.

---

## Review by Category

### 1. Planner consistency — Strength
All five services (`mission-planner.service.ts:1-208`, `discovery-planner.service.ts:1-207`, `knowledge-planner.service.ts:1-208`, `evidence-planner.service.ts:1-208`, `teaching-planner.service.ts:1-208`) share the exact same method sequence, same optional-DI shape (`metrics?`, `auditLog?`), same `DEFAULT_PROVIDER = 'mock-llm'` / `DEFAULT_MODEL = 'mock-llm-v1'` constants, same try/catch envelope. Risk: **Low** for behavioral inconsistency today; **Medium** for drift risk over time (see §9).

### 2. BrainContext consistency — Weakness
`BrainContext` (`infrastructure/ai-brain/brain-context.types.ts:8-24`) is a single flat object with six domain slices; `ContextAssemblyService.assemble()` (`context-assembly.service.ts:26-34`) fetches **all six** on every call via `Promise.all`, regardless of which capability is calling. Discovery Planner's prompt uses only `discovery`, `goal`, `recommendation` (`discovery-prompt.ts:12-16`); Knowledge/Evidence/Teaching prompts use `goal`, `roadmap`, `assessment`, `recommendation`, `discovery` but never `session`; Mission Planner uses `goal`, `roadmap`, `session`, `recommendation` but never `discovery` or `assessment`. Every planner still pays for a `LearningSessionService.getSession()` and `AssessmentService.getAssessmentHistory()` round trip it never reads. Risk: **Medium** (performance + coupling — see §15).

### 3. Prompt consistency — Strength with one gap
All five `build*Prompt()` functions (`mission-prompt.ts`, `discovery-prompt.ts`, `knowledge-prompt.ts`, `evidence-prompt.ts`, `teaching-prompt.ts`) follow the identical shape: `{ promptVersion, instruction, context: {...} }` serialized via `JSON.stringify`. Each defines its own `*_PROMPT_VERSION` constant, correctly threaded through to the response (`promptVersion` field) for auditability. Gap: no shared prompt envelope/builder — the `{promptVersion, instruction, context}` wrapper is duplicated five times with no compile-time guarantee the shape stays aligned if one prompt is edited later. Risk: **Low**.

### 4. Explainability consistency — Strength
Every planner calls the same `ExplainabilityRulesService.validate()` (`shared/services/explainability-rules.service.ts:11-25`) with the same three fields (`confidence`, `reasoning`←`response.explanation`, `traced_to`). One real inconsistency: `traced_to` composition differs by planner without a documented reason — Mission Planner cites `goal/roadmap/session` (`mission-planner.service.ts:69-72`); Discovery cites `discovery/goal/recommendation` (`discovery-planner.service.ts:69-72`); Knowledge/Evidence/Teaching all cite `goal/roadmap/recommendation/discovery` (e.g. `knowledge-planner.service.ts:69-73`) — none cite `session` or `assessment` even though Knowledge/Evidence/Teaching pull `assessment` into their prompts. So evidence citations under-report what's actually informing the model. Risk: **Medium** (explainability claims not fully backed by what was traced).

### 5. Metrics consistency — Strength
`MetricsService` (`infrastructure/observability/metrics.service.ts`, 534 lines) defines an identical triad per planner — `increment*PlanGenerated`, `increment*PlanFallbackUsed`, `record*PlanConfidence` — for Mission (lines 419-427), Discovery (435-443), Knowledge (451-459), Evidence (467-475), Teaching (483-491). Every planner calls its triad identically in `emitObservability`, only on the `SUCCESS` path (fallback still counts as `SUCCESS` since a response was produced). Risk: **Low**. Debt: 5 hand-written triads (~75 lines) instead of one parameterized-by-capability helper — see §10.

### 6. Audit consistency — Strength
Every planner calls `auditLog?.recordSecurityEvent()` with a `.catch(() => undefined)` guard (e.g. `mission-planner.service.ts:191-206`), so an audit-write failure never fails the request — consistent and intentional across all five. Operation names follow a uniform `<CAPABILITY>_PLAN_GENERATED` convention. Note: this is a *different* audit path than `AuditLogService.recordFromDomainEvent()` (`audit-log.service.ts:17-30`), which is used elsewhere in the codebase for domain-event-sourced audit trails — the two paths coexist by design (security events vs. domain events) but nothing in the code documents that distinction for a new contributor. Risk: **Low**.

### 7. Structured logging consistency — Weakness
Every planner's `emitObservability` calls raw `console.log(JSON.stringify({...}))` (e.g. `mission-planner.service.ts:167-181`) instead of the dedicated `StructuredLoggerService` (`infrastructure/observability/structured-logger.service.ts`, 60 lines) that already exists in the same `infrastructure/observability/` tree the planners import `MetricsService` from. The five planners are consistent *with each other* but inconsistent with the logging abstraction the codebase otherwise provides. Risk: **Medium** — bypasses whatever `StructuredLoggerService` centralizes (likely redaction, log level routing, or transport switching); a future change to logging behavior (e.g. shipping to a log aggregator) will miss all five planners silently.

### 8. Confidence calculation consistency — Weakness
Two parallel confidence conventions exist in the codebase: the five planners (and `AiRuntimeService`) use a raw `number` in **[0,1]** with an inline `normalizeConfidence()` clamp duplicated identically five times (e.g. `mission-planner.service.ts:153-158`) plus a sixth copy in `ai-runtime.service.ts:236-241`; the assessment/recommendation modules use the `Confidence` value object (`shared/domain/vocabulary/confidence.vo.ts:6-19`) on a **0-100** scale, explicitly documented as replacing prior duplication (`ConfidenceScore`/`RecommendationConfidence`). The five planners do not use `Confidence.create()` at all — they reintroduced the exact duplication pattern that VO was built to eliminate, just on a different scale. Risk: **Medium** — a value crossing from `BrainContext.assessment` (built on the 0-100 `Confidence` VO) into a planner's `[0,1]` field, or vice versa, has no compile-time or runtime guard against a scale mismatch.

### 9. Duplication analysis — Weakness (the central finding)
`buildFallbackResponse`, `normalizeConfidence`, and `emitObservability`'s structure are **identical logic, five times over**, differing only in capability name, response field names, and the plan-specific `normalize*` body. Concretely: `normalizeConfidence` (5 copies, ~6 lines each), `emitObservability`'s console.log/metrics/audit sequencing (5 copies, ~40 lines each), the `try/catch` + `explainabilityRules.validate()` envelope in the public method (5 copies, ~35 lines each). This is roughly **250-300 lines of duplicated control flow** across the five services. Risk: **High** — this is the single biggest maintainability liability in the reviewed code. It is already de-synchronizing from a sixth, older copy of the same pattern in `AiRuntimeService`'s `withTimeout`/`normalizeConfidence`/circuit-breaker logic (`ai-runtime.service.ts:182-193, 236-241` vs. `resilient-llm-gateway.service.ts:50-61`), which duplicates `ResilientLlmGateway` almost verbatim but was clearly written independently (in-memory circuit state vs. Redis-backed, test-mode string sniffing vs. none). Any bug fix to resilience or normalization logic today must be applied in up to **six** places by hand, with nothing to catch a missed one.

### 10. Shared abstraction opportunities — Analysis only, no implementation
Concrete opportunities the code invites (not to be built as part of this review):
- An abstract `BasePlannerService<TRequest, TResponse, TDomain>` (or a composed helper function) that owns `generate()`'s try/catch envelope, `explainabilityRules.validate()` call, `normalizeConfidence()`, and `emitObservability()`, parameterized by capability name, response-shape hooks (`buildFallback`, `buildFromLlm`), and metrics triad. Would collapse ~250 lines of duplication to near zero and guarantee the five planners can't drift.
- A single generic `MetricsService.recordPlannerOutcome(capability, {generated, fallbackUsed, confidence})` replacing the 5×3 hand-written method triad (`metrics.service.ts:419-491`).
- A shared `buildPlannerPrompt(version, instruction, contextSlice)` envelope so `{promptVersion, instruction, context}` isn't re-typed five times.
- Reconciling `AiRuntimeService` and the five planners onto one resilience/explainability path (`ResilientLlmGateway` + `ExplainabilityRulesService`) instead of two independent implementations of the same ideas.

### 11. Extension cost — Weakness
Adding a 6th planner today means: copying a ~208-line service file, a ~20-line prompt file, a ~40-line engine file, a ~15-line module file, and three spec files, then hand-editing every capability-specific string/field name across all of them. There is no scaffold, generator, or base class — the existing four `*-planner` directories are themselves evidence this copy-paste process already happened four times (Discovery → Knowledge → Evidence → Teaching appear to be copies of each other with only nouns changed, confirmed identical structure and line counts). Risk: **Medium-High** — cost is linear and manual per planner, and manual copy-paste is exactly the mechanism that let `AiRuntimeService` diverge from `ResilientLlmGateway`.

### 12. AI Runtime readiness — Fail
No route, controller, scheduled job, or orchestration call in the entire `Apps/ai-backend/src` tree references `MissionPlannerService`, `DiscoveryPlannerService`, `KnowledgePlannerService`, `EvidencePlannerService`, or `TeachingPlannerService` outside their own module and their own tests (confirmed via full-tree symbol search — 20 matches total, all within the five planner directories). `AiRuntimeController` (`modules/ai-runtime/ai-runtime.controller.ts:6-15`) exposes `POST /ai/execute`, but its `AiExecuteDto.route` is restricted to `goal|roadmap|learning_session|knowledge|evidence|assessment|recommendation|discovery|teaching` (`ai-execute.dto.ts:17-27`) — there is no `mission_planner`/`discovery_planner`/etc. route value, and `AiRuntimeService.buildDomainContext()`'s switch (`ai-runtime.service.ts:80-101`) has no case that would reach any of the five services. **The five planners are unreachable in production today.** Risk: **Critical.**

### 13. Agent Runtime readiness — Fail
There is no "agent" concept anywhere in `Apps/ai-backend/src` (confirmed via case-insensitive repo-wide search: zero matches for `agent` outside this review's own scope). No tool-calling loop, no multi-step planner orchestration, no agent memory/state store exists that could invoke Mission/Discovery/Knowledge/Evidence/Teaching planners in sequence or compose their outputs into a single learner-facing decision. The five planners each independently call `ContextAssemblyService.assemble()` for the *same* domains with no shared context cache across a single logical request — if all five were called back-to-back for one learner action, six Mongo/service round trips would be repeated five times over with no batching. Risk: **Critical** for any near-term agent-orchestration milestone; today there is no mechanism to compose these capabilities at all, wired or not.

### 14. Technical debt — Summary
- ~250-300 lines of duplicated control flow across 5 planner services (§9).
- A second, independently-evolved resilience/explainability implementation in `AiRuntimeService` that already disagrees with `ResilientLlmGateway` in mechanism (in-memory vs. Redis circuit breaker) (§9, §12).
- Two incompatible confidence scales/representations live side by side ([0,1] raw number vs. `Confidence` VO on 0-100) (§8).
- Structured logging bypassed via raw `console.log` in all five planners despite `StructuredLoggerService` existing (§7).
- `BrainContext.assessment` marked optional specifically to avoid touching the two capabilities assembled before it existed (`brain-context.types.ts:18-21`) — a documented but still real backward-compatibility patch inside a supposedly uniform context object.
- Full-domain over-fetch on every `ContextAssemblyService.assemble()` call regardless of which slices the caller needs (§2, §15).

### 15. Performance considerations
`ContextAssemblyService.assemble()` always issues 6 parallel calls (Goal, Roadmap, LearningSession, Recommendation, Discovery, Assessment) even though no single planner reads more than 5 of the 6 slices, and Discovery Planner reads only 2. This is not a correctness bug (unused fields are simply ignored) but is wasted I/O on every single planner invocation — multiplied across 5 planners with no per-request context cache, a single "generate everything for this learner" call (the shape §13 implies an eventual agent orchestrator would want) would issue 30 domain-service calls where 6 (assembled once, sliced five ways) would suffice. Risk: **Medium**, becomes **High** once an orchestrator (§13) starts calling multiple planners per request.

### 16. Maintainability
Positive: identical structure means a developer who understands one planner understands all five immediately, and the tests (`__tests__/*.spec.ts`, unit + engine + Mongo-memory-server integration spec per planner) are thorough and follow one clear pattern (verified in full via `mission-planner.integration.spec.ts:1-67` — asserts fallback behavior, audit-event persistence, and full DI-graph resolution). Negative: that same identical structure is unenforced by any shared type or base class, so "identical" today is an invariant nobody is guarding — the moment one planner's `emitObservability` or `normalizeConfidence` is tweaked without updating the other four, "consistency" becomes "four consistent, one silently different," and nothing in the type system or test suite would catch that divergence (each planner's tests only assert its own behavior, never cross-planner invariants).

---

## Strengths
- One clear, well-tested pattern followed without deviation across all five planners.
- Deterministic fallback engines guarantee every planner always returns a usable response, even with the LLM unavailable — verified by design (`*-planning.engine.ts`) and by test (`mission-planner.integration.spec.ts:41-65` explicitly asserts fallback behavior against the shared mock LLM).
- Circuit breaker is correctly scoped per `capability:provider` pair (`resilient-llm-gateway.service.ts:47-48`), so one capability's LLM outage cannot cascade into another's.
- `ContextAssemblyService` is a genuine, well-documented boundary-enforcement mechanism (`context-assembly.service.ts:10-14`) — capabilities cannot bypass it to reach domain services directly.
- Audit-write failures are non-blocking everywhere (`.catch(() => undefined)`), consistently applied.

## Weaknesses
- Five planner services are unreachable from any controller, job, or orchestrator (§12) — this is the most severe finding in the review.
- ~250-300 lines of duplicated logic with no shared base (§9), already shown to drift once (`AiRuntimeService` vs. `ResilientLlmGateway`).
- Two incompatible confidence representations coexist (§8).
- Structured logging abstraction exists but is bypassed by all five planners (§7).
- `traced_to` explainability citations under-report the context slices actually fed into the prompt for Knowledge/Evidence/Teaching (§4).
- No context-fetch scoping — every planner over-fetches all six BrainContext domains regardless of need (§2, §15).

## Technical Debt (prioritized causes, not fixes)
1. Missing shared base/helper for the planner request lifecycle.
2. Two independent resilience/explainability implementations (`ResilientLlmGateway` path vs. `AiRuntimeService`) instead of one.
3. Two confidence representations instead of one.
4. `console.log` instead of `StructuredLoggerService` in all five planners.
5. Full six-domain context fetch with no per-capability slice awareness.

## Refactoring Opportunities (analysis only — not performed)
- Extract a shared planner base/helper to eliminate the ~250-300 duplicated lines (§9, §10).
- Collapse the 5×3 metrics-triad into one parameterized method (§10).
- Migrate the five planners' `[0,1]` confidence to reuse (or be reconciled with) `Confidence` VO, or explicitly document why capability-level confidence is intentionally a distinct concept from assessment/recommendation confidence.
- Replace `console.log` calls with `StructuredLoggerService` in all five `emitObservability` methods.
- Let `ContextAssemblyService.assemble()` accept a slice selector (or split into per-domain lazy getters) so a planner only pays for the domains its prompt actually reads.
- Decide, and document, the relationship between `AiRuntimeService`/`AiRuntimeController` and the five planners: either retire the old generic route dispatcher in favor of dedicated planner controllers/routes, or explicitly wire the planners as new `route` values in the existing dispatcher.

## AI Runtime Readiness: **Not Ready**
No HTTP route, scheduled job, or other consumer exists for any of the five planners. This must be resolved (a controller per planner, or new route entries in `AiRuntimeService`, or an orchestration layer) before these capabilities can be considered "shipped."

## Agent Runtime Readiness: **Not Ready**
No agent/orchestration concept exists in the codebase to sequence or compose the five planners. Building one should also resolve the per-request over-fetch problem (§15) by assembling `BrainContext` once per learner action rather than once per planner.

## Overall Score: 6.5 / 10

## Verdict: **CONDITIONAL PASS**
Conditional on: (1) wiring at least one real consumer (controller or orchestrator) for the five planners before they are considered production-ready, and (2) opening a follow-up work item to collapse the five-way duplication before a sixth planner is added using the same copy-paste process.

## Prioritized Backlog
1. **(Critical)** Wire the five planners to a real consumer — either dedicated controllers or new routes in `AiRuntimeService` — so they are reachable at all.
2. **(High)** Extract a shared base/helper for the planner request lifecycle to eliminate ~250-300 duplicated lines and prevent further silent drift.
3. **(High)** Reconcile `AiRuntimeService`'s independent resilience/explainability implementation with `ResilientLlmGateway` + `ExplainabilityRulesService` — one mechanism, not two.
4. **(Medium)** Resolve the two confidence representations ([0,1] raw vs. `Confidence` VO 0-100) into one documented convention.
5. **(Medium)** Replace `console.log` in all five planners' `emitObservability` with `StructuredLoggerService`.
6. **(Medium)** Make `traced_to` citations match the actual context slices used in each planner's prompt (add `session`/`assessment` where they're read).
7. **(Medium)** Scope `ContextAssemblyService.assemble()` (or introduce per-domain lazy access) so planners stop over-fetching unused BrainContext slices.
8. **(Low)** Document the intentional distinction between `AuditLogService.recordSecurityEvent` and `recordFromDomainEvent` for future contributors.
