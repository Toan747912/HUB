# ADR-061 — AI Agent Layer Architecture

**Status:** Proposed
**Work package:** WP-AI-03A (architecture only — no implementation)
**Date:** 2026-07-04
**Depends on:** WP-AI-01 (AI Brain capability), WP-AI-02 (production hardening, see `AIBrainCertification.md`)
**Enables:** WP-AI-03B (implementation)

---

## Context

The AI Brain layer is production-hardened and certified (`AIBrainCertification.md`). It consists of:

- `AiRuntimeService` — HTTP-facing dispatcher (`modules/ai-runtime/`), routes `AiExecuteDto.route` to one of five planner capabilities via `isPlannerCapability()` / `dispatchToPlanner()`.
- Five planners — Mission, Discovery, Knowledge, Evidence, Teaching — each a thin subclass of `BasePlannerService<TRequest, TResponse>`.
- `BasePlannerService` (`infrastructure/ai-brain/base-planner.service.ts`) — the shared pipeline: assemble context → call `ResilientLlmGateway` → build response (abstract hook) → validate via `ExplainabilityRulesService` → emit log/metrics/audit (`emitObservability()`).
- `ContextAssemblyService` — builds `BrainContext` from goal/session/user state.
- `ResilientLlmGateway` + `RedisCircuitBreakerService` — the only sanctioned path to an LLM provider, with circuit breaking and fallback.
- `StructuredLoggerService`, `MetricsService`, `AuditLog`/atomic outbox — the observability and audit substrate.
- `planner-contract-audit.ts` + Planner Certification — a repeatable, manual conformance check (35/35 rules across 5 planners today).

Each planner today is a **single-shot request/response transformer**: one prompt in, one validated response out, per HTTP call. There is no concept of:

- An agent that persists identity/state across multiple planner invocations.
- A workflow that sequences more than one planner or tool call to satisfy one user request.
- A tool-calling boundary (search, retrieval, external API, code execution) distinct from the LLM call itself.
- Memory that outlives a single request (beyond what `ContextAssemblyService` reconstructs fresh each time from persisted domain state).

The product roadmap (multi-step tutoring flows, autonomous study-plan agents, tool-augmented answers) requires these capabilities. Bolting them directly onto `AiRuntimeService` or `BasePlannerService` would break the planner contract that WP-AI-02 just certified and re-couple orchestration concerns into what is currently a clean single-shot pipeline.

## Problem Statement

We need an architectural seam that lets the system support **multi-step, stateful, tool-using agent behavior** without:

1. Modifying any of the five planners or `BasePlannerService`.
2. Changing the `AiRuntimeService` → planner dispatch contract that already exists and is certified.
3. Duplicating the observability/audit/circuit-breaker machinery the AI Brain layer already owns.
4. Creating a second, competing way to call an LLM (all LLM calls must still funnel through `ResilientLlmGateway`, transitively, via planners).

The question this ADR answers: **where does agent orchestration live, and what may it depend on, such that planners remain exactly what they are today — deterministic, certifiable, single-shot capabilities — while becoming callable *steps* inside something larger?**

## Goals

- Introduce an **Agent Layer** that sits above the existing AI Brain, treating each of the five planners as an invocable, unmodified capability.
- Support **multi-step workflows**: an agent can call more than one planner, in sequence or with branching, to satisfy one user-level goal.
- Support **tool calling** as a first-class, auditable concept distinct from LLM invocation (e.g., retrieval, external API calls, computation) — architecture only in this ADR, no tools implemented yet.
- Support **memory** that persists across steps within an agent run, and (future) across runs for the same user/goal — architecture only, no store implemented yet.
- Support **verification** as an explicit step after workflow completion, layered on top of (not replacing) `ExplainabilityRulesService`.
- Preserve 100% backward compatibility: every existing HTTP route, planner, and contract keeps working unchanged if the Agent Layer is never invoked.
- Give WP-AI-03B a concrete, unambiguous module/dependency blueprint to implement against.

## Non-Goals

- Do not implement any runtime logic, controller, or module in this work package.
- Do not modify `BasePlannerService`, any of the five planners, `ContextAssemblyService`, `ResilientLlmGateway`, `ExplainabilityRulesService`, the outbox, `StructuredLoggerService`, or `MetricsService`.
- Do not define concrete tool implementations (e.g., "web search tool," "code execution tool") — only the boundary that will host them.
- Do not define a concrete memory store or schema — only the boundary and its dependency rules.
- Do not define autonomous (no-human-in-the-loop, unbounded) agent behavior — this ADR's lifecycle is finite, single-request, bounded-step. Fully autonomous agents are a named future extension point, not delivered here.
- Do not change `AiExecuteDto`, `AiRuntimeService`'s existing routing, or any existing HTTP contract.

## Architecture Decision

Introduce a new layer, **the Agent Layer**, strictly above the AI Brain and strictly below (or beside) the existing HTTP surface. The AI Brain becomes a dependency the Agent Layer calls into — it does not call back up.

### Layering

```
HTTP
 ↓
AI Runtime            (existing, unmodified — still the direct route for single-shot planner calls)
 ↓
Agent Runtime          (new — entry point for agent-mediated requests)
 ↓
Agent Registry          (new — resolves a named agent to its definition/config)
 ↓
Agent (Agent Core)     (new — one bounded unit: identity, allowed planners/tools, policy)
 ↓
Planner                 (existing, unmodified — Mission/Discovery/Knowledge/Evidence/Teaching)
 ↓
Workflow                (new — sequences planner/tool calls the Agent is permitted to make)
 ↓
Tool                    (new — boundary for non-LLM actions: retrieval, external calls, computation)
 ↓
Memory                  (new — reads/writes agent-run state; does not call planners or tools)
 ↓
Verification            (new — post-workflow check, delegates final explainability gate to ExplainabilityRulesService)
 ↓
Response
```

Two things to note about this diagram:

1. **`AiRuntimeService` is not replaced.** It remains the direct, unmodified path for any caller that just wants one planner call — exactly today's behavior. The Agent Runtime is a *new, additional* entry point for callers that need multi-step/tool/memory behavior. Both entry points terminate at the same five planners.
2. **Workflow sits between Agent and Planner/Tool**, not beside them — an Agent never calls a Planner or Tool directly; it always does so by executing a Workflow. This keeps "what steps happened and in what order" centrally recorded in one place (the Workflow), which is what Verification and audit both read.

### Why this shape

- Planners are already a certified, stable contract (`PlannerContractReport.md`). Treating them as an opaque, callable capability — never modifying them, never having them call upward — is what makes the new layer additive rather than invasive.
- Splitting **Agent** (identity + policy: *what am I allowed to do*) from **Workflow** (sequencing: *what did I do, in what order*) from **Tool** (execution: *how do I do one non-LLM action*) from **Memory** (state: *what do I remember*) from **Verification** (gate: *was the output acceptable*) gives each concern one owner and one reason to change, mirroring the same single-responsibility discipline `BasePlannerService` already uses internally (assemble → call → build → validate → observe).
- Putting **Verification** as its own late stage — rather than folding it into Workflow or Agent — means `ExplainabilityRulesService` remains the single final gate for *every* response, planner-direct or agent-mediated. The Agent Layer adds agent-level checks (e.g., "did the workflow complete all required steps," "did tool output pass a schema check") but never bypasses or duplicates planner-level explainability, which still runs unchanged inside `BasePlannerService.execute()` for every planner call the workflow makes.

## Alternatives Considered

**A. Extend `BasePlannerService` with multi-step/tool support directly.**
Rejected. This would break the just-certified planner contract (`EXTENDS_BASE_PLANNER_SERVICE`, single `execute()` shape) and couple orchestration concerns into a class whose entire value is being a small, uniform, auditable base. Every future planner would inherit agent complexity it doesn't need.

**B. Put orchestration inside `AiRuntimeService`.**
Rejected. `AiRuntimeService`'s job is HTTP-facing routing to a single capability; growing it into a multi-step orchestrator would make it a second, ad-hoc agent framework with no registry, no memory boundary, and no clean place for tool calls — effectively rebuilding this ADR's layer, but without dependency rules.

**C. A single monolithic "Agent Service" (no Registry/Workflow/Tool/Memory/Verification split).**
Rejected. Collapsing the layer into one module makes it impossible to independently extend tool-calling, memory, or verification later without re-touching the same file/class each time (violates the Future Extension Points goal below). The split costs a handful of module boundaries now and buys independent evolution later.

**D. Bypass planners entirely and have agents call `ResilientLlmGateway` directly.**
Rejected outright. This would create a second path to the LLM outside the planner contract, duplicating circuit-breaking, explainability, and observability logic that already exists and is certified. Every agent capability must still be expressed as a planner call.

## Consequences

**Positive:**
- Zero changes to certified AI Brain code; `planner-contract-audit.ts` and `PlannerContractReport.md` remain valid without modification.
- Multi-step, tool-using, memory-backed agent behavior becomes possible without a second LLM-calling path.
- Each new concern (registry, workflow, tool, memory, verification) is independently testable and independently extensible.
- `AiRuntimeService` and direct single-planner callers are entirely unaffected — this is purely additive.

**Negative / costs:**
- One more layer of indirection between HTTP and the LLM call for agent-mediated requests (acceptable: single-planner callers skip it entirely via the existing `AiRuntimeService` path).
- Six new module boundaries to build, document, and test in WP-AI-03B, versus one big module.
- Workflow becomes a new place where a bug could cause a planner to be called with a stale or malformed `BrainContext` — the boundary contract (Workflow → Planner) must be specified precisely in WP-AI-03B to avoid this.
- Memory introduces new data-lifecycle questions (retention, PII, TTL) that must be resolved before WP-AI-03B implements a store — flagged as an open question below, consistent with the existing outbox TTL gap noted in `project_ai_backend_nonatomic_outbox` memory.

## Future Extension Points

- **Memory Layer:** `memory-runtime` module is scaffolded by this ADR but empty; a future WP can implement short-term (per-run) and long-term (per-user/goal, cross-run) memory behind the same boundary without touching Agent, Workflow, or Planner.
- **Tool Calling:** `tool-runtime` module defines the boundary (Workflow → Tool, Tool → nothing upward) so concrete tools (retrieval, external APIs, computation) can be added as plugins without changing Workflow or Agent Core.
- **Autonomous Agents:** the Agent Runtime lifecycle defined below is finite and bounded (one request, N steps, terminates). A future autonomous mode (unbounded loop, human-in-the-loop checkpoints, scheduled re-invocation) can be added as a new Agent Runtime *mode* without changing the Registry, Agent Core, Workflow, Tool, or Memory contracts — only the Runtime's loop-termination policy changes.
- **Multi-agent collaboration:** because Agent Registry resolves agents by name/capability, a future workflow could invoke a second agent as if it were a tool (Agent-as-Tool), without changing the Tool boundary contract — this is a candidate future ADR, not decided here.

## Compatibility with Existing AI Brain

- No file under `infrastructure/ai-brain/`, `modules/{mission,discovery,knowledge,evidence,teaching}-planner/`, or `infrastructure/observability/` is touched.
- `AiRuntimeService`'s existing dispatch (`isPlannerCapability` → `dispatchToPlanner`) is untouched; the Agent Runtime is a new, parallel entry point, not a replacement.
- Every planner call made by a Workflow goes through the exact same `BasePlannerService.execute()` pipeline as today — same context assembly, same `ResilientLlmGateway`, same explainability validation, same metrics/audit emission. The Agent Layer cannot see or skip any of these steps; it can only decide *which* planner to call and *in what order*.
- `ExplainabilityRulesService` continues to be invoked exactly where it is today (inside `BasePlannerService.execute()`), once per planner call. The Agent Layer's Verification stage is strictly additive — it runs *after* all planner-level explainability checks have already passed for every step in the workflow.

## Migration Strategy

This is additive, not a migration:

1. **WP-AI-03A (this ADR):** architecture only, no code.
2. **WP-AI-03B:** scaffold the six new modules (empty `AgentRuntimeModule`, `AgentRegistryModule`, etc., wired into `AppModule` but not routed from any controller) with the dependency rules below enforced (e.g., via lint boundary rules or a contract-audit script analogous to `planner-contract-audit.ts`).
3. **WP-AI-03C (future):** implement one trivial reference agent (e.g., an agent whose only workflow step is calling Mission Planner once) end-to-end through the new stack, proving the layering works, before any tool or memory logic is added.
4. **WP-AI-03D+ (future):** add Tool implementations, then Memory implementations, incrementally, each behind its already-defined boundary.
5. At no point does an existing HTTP route change behavior; the Agent Runtime is reachable only via new routes added in WP-AI-03B+.

---

## Module Boundaries

New modules under `Apps/ai-backend/src/modules/` (naming mirrors existing `*-planner` convention) and `Apps/ai-backend/src/infrastructure/`:

| Module | Responsibility | May be called by |
|---|---|---|
| `modules/agent-runtime` | HTTP/entry-point-facing. Accepts an agent-mediated request, resolves the agent via Agent Registry, invokes it, returns the final Response. Owns retry/failure policy at the run level. | HTTP layer |
| `modules/agent-registry` | Resolves an agent name/id to its Agent Core definition (allowed planners, allowed tools, policy/config). No execution logic. | Agent Runtime |
| `modules/agent-core` | The Agent itself: identity, permitted capability set, invokes a Workflow to fulfill the request. No planner/tool/memory implementation details. | Agent Registry (instantiation), Agent Runtime (invocation) |
| `infrastructure/workflow-runtime` | Sequences steps (planner calls, tool calls, memory reads/writes) for one agent run. Owns step-level retry and step ordering/branching. | Agent Core |
| `infrastructure/tool-runtime` | Boundary for non-LLM actions. Hosts a tool registry/interface; concrete tools plug in here (future WPs). | Workflow |
| `infrastructure/memory-runtime` | Boundary for agent-run state (short-term) and cross-run state (long-term, future). Read/write interface only in this ADR. | Workflow (and, read-only, Agent Core for context priming) |
| `infrastructure/verifier` | Post-workflow verification: checks the workflow completed as required, then delegates the final content-level gate to the existing `ExplainabilityRulesService`. | Agent Runtime (after Workflow completes) |

Existing modules, unchanged, now also consumed by the new layer:

- `modules/{mission,discovery,knowledge,evidence,teaching}-planner` — invoked by Workflow, exactly as `AiRuntimeService` invokes them today.
- `infrastructure/ai-brain` (`BasePlannerService`, `ContextAssemblyService`) — untouched, internal to planners.
- `shared/services/explainability-rules.service.ts` — untouched; also the delegate target of the new `verifier` module.
- `infrastructure/observability` (`StructuredLoggerService`, `MetricsService`) and `infrastructure/audit` — reused by the new modules for their own logging/metrics/audit emission (additive calls, same services, no changes to the services themselves).

## Dependency Rules

Allowed (→ means "may call"):

```
Agent Runtime   → Agent Registry
Agent Runtime   → Verifier
Agent Registry  → Agent Core           (instantiates/resolves, does not execute)
Agent Core      → Workflow Runtime
Workflow Runtime → Planner              (existing five planners, via their existing public contract)
Workflow Runtime → Tool Runtime
Workflow Runtime → Memory Runtime
Verifier        → ExplainabilityRulesService   (existing, unchanged)
Any new module  → Observability (StructuredLoggerService, MetricsService), Audit   (existing, unchanged, additive)
```

Forbidden (must not call):

```
Planner          MUST NOT call Agent Core, Workflow Runtime, Agent Runtime, or Agent Registry.
Memory Runtime    MUST NOT call Planner, Workflow Runtime, Tool Runtime, or Agent Core.
Tool Runtime      MUST NOT call Agent Runtime, Agent Registry, Agent Core, or Planner directly
                  (a tool that needs LLM reasoning is itself modeled as a Workflow step calling a Planner,
                   not as a Tool calling a Planner internally).
Tool Runtime      MUST NOT call ResilientLlmGateway directly — no second path to the LLM.
Agent Registry    MUST NOT call Workflow Runtime, Tool Runtime, Memory Runtime, or Planner
                  (resolution only, no execution).
Verifier          MUST NOT call Workflow Runtime, Tool Runtime, Memory Runtime, or Agent Core
                  (it inspects the completed run's output/trace, it does not re-enter the workflow).
Nothing           may call ResilientLlmGateway except through an existing Planner via BasePlannerService.
```

This preserves a strict one-directional layering (Runtime → Registry → Agent → Workflow → {Planner, Tool, Memory} → Verifier → Response) with no upward calls and no module skipping past Workflow to reach Planner/Tool/Memory directly except via the Agent Core → Workflow Runtime edge.

## Lifecycle

```
Request
  ↓
Agent Runtime        — receives request; assigns runId/traceId; owns overall run timeout
  ↓
Agent Registry        — resolves agent name → Agent Core definition; 404/failure if unknown agent
  ↓
Agent Core             — validates request against agent's permitted capabilities; constructs initial Workflow input
  ↓
Workflow Runtime       — executes steps in sequence/branch:
  │                       each step is either a Planner call, a Tool call, or a Memory read/write
  ↓
  ├─ Planner step  → existing BasePlannerService.execute() pipeline, unchanged (context assembly →
  │                   ResilientLlmGateway → explainability validation → planner-level metrics/audit)
  ├─ Tool step     → Tool Runtime executes one tool invocation, returns structured result to Workflow
  └─ Memory step   → Memory Runtime reads/writes run-scoped (and future cross-run) state
  ↓
Verification           — Verifier checks: did the workflow reach a terminal, required state; are all
                          step outputs structurally valid; then delegates final content gate to
                          ExplainabilityRulesService (same service, same rules, as today)
  ↓
Response
```

**Retry behavior:**
- Step-level retry (a single Planner or Tool call failing transiently) is owned by **Workflow Runtime**, and for Planner steps specifically, transient LLM failures are still handled by the existing `ResilientLlmGateway`/circuit-breaker retry logic inside the planner — Workflow Runtime does not duplicate LLM-level retry, it only retries at the step-invocation level (e.g., re-invoke a failed Tool call).
- Run-level retry (the whole agent run failing and being safe to restart) is owned by **Agent Runtime**, bounded by a max-attempts policy at the run level, distinct from and layered above step-level retry.

**Failure behavior:**
- A Planner step failure surfaces exactly as it does today (existing planner error/fallback contract, unchanged) — Workflow Runtime treats it as a failed step and applies its own step-failure policy (abort run, skip-if-optional, or fallback branch — policy owned by Agent Core's definition of the agent, not hardcoded in Workflow Runtime).
- A Tool step failure is caught at the Tool Runtime boundary and returned to Workflow Runtime as a structured failure, never a raw exception crossing the boundary.
- Any unrecoverable failure at any stage propagates up to Agent Runtime, which is responsible for emitting the terminal failure response and the corresponding audit/metrics failure event.

**Circuit breaker ownership:**
- Unchanged: `RedisCircuitBreakerService`, invoked from inside `ResilientLlmGateway` (via planners), remains the *only* circuit breaker for LLM calls. Neither Workflow Runtime nor Tool Runtime introduces a second LLM circuit breaker.
- Tool Runtime may (future WP, not decided here) introduce its own circuit breaker for flaky external tool dependencies, but that is a distinct breaker instance scoped to tools, never shared with or substituting for the LLM breaker.

**Audit ownership:**
- Planner-level audit events continue to be emitted exactly as today, from inside `BasePlannerService.emitObservability()`, once per planner call, regardless of whether the call originated from `AiRuntimeService` directly or from a Workflow step.
- Agent Runtime additionally emits one run-level audit event per agent run (start, terminal outcome), so a full agent run is reconstructable as "1 run-level audit event + N planner-level audit events it triggered," without changing the shape of the existing planner-level events.

**Metrics ownership:**
- Planner-level metrics (`planner_execution_total`, `planner_latency_ms`, etc.) continue to be emitted exactly as today from `BasePlannerService`.
- Agent Runtime is the owner of new, additive, run-level metrics (e.g., run count/status, run latency, steps-per-run) via the existing `MetricsService`, using new metric names so they cannot collide with or alter existing planner metrics.

## Explainability

`ExplainabilityRulesService` remains **the single final content-validation gate in the whole system**, unchanged:

- For a direct (non-agent) call through `AiRuntimeService`, it is invoked exactly once, inside `BasePlannerService.execute()`, exactly as today.
- For an agent-mediated call, it is invoked **once per Planner step** inside the workflow (same call site, same service, unchanged), *and* the new Verifier stage performs one additional, purely agent-level check afterward (did the workflow complete its required steps; are step outputs structurally well-formed) before declaring the overall run's response valid.
- The Verifier never re-implements, overrides, or duplicates explainability rules — it delegates to the existing service for the content-level gate and only adds run-completeness checks that don't exist in `BasePlannerService` (because a single planner call has no concept of "did all required steps run").
- Net effect: an agent-mediated response cannot become invalid or unexplainable in a way that a direct planner response couldn't — planner-level explainability is a strict superset guarantee that still applies to every LLM-produced piece of content in the run.

---

## Output Summary

### 1. Architecture summary
A new Agent Layer (Agent Runtime → Agent Registry → Agent Core → Workflow Runtime → {Planner, Tool Runtime, Memory Runtime} → Verifier) sits strictly above the existing, unmodified AI Brain. Agents never call planners directly — only through a Workflow, which is the single place step sequencing, retry, and audit trail live. All LLM calls continue to route exclusively through the existing planners' `ResilientLlmGateway`. `ExplainabilityRulesService` remains the sole content-validation gate; the new Verifier only adds a run-completeness check on top.

### 2. Files added
- `Docs/12_AI/ADR-061-AIAgentArchitecture.md` (this file)

No source code added or modified.

### 3. Key diagrams
See "Architecture Decision" (layering diagram) and "Lifecycle" (request/response flow) sections above.

### 4. Decisions made
- Agent Layer is additive; `AiRuntimeService` and all five planners are untouched.
- Six new module boundaries: `agent-runtime`, `agent-registry`, `agent-core`, `workflow-runtime`, `tool-runtime`, `memory-runtime`, plus `verifier`.
- Workflow Runtime is the sole caller of Planner/Tool/Memory — Agent Core never calls them directly.
- No second path to the LLM: Tool Runtime and Memory Runtime are explicitly forbidden from calling `ResilientLlmGateway`.
- Verification layers on top of, never replaces, `ExplainabilityRulesService`.
- Circuit breaking, audit, and metrics ownership stay with the existing planner pipeline for planner-level concerns; new run-level concerns get new, additively-named metrics/audit events owned by Agent Runtime.

### 5. Risks
- **Scope creep risk:** WP-AI-03B could be tempted to implement Tool/Memory logic immediately; migration strategy explicitly sequences a trivial reference agent first (WP-AI-03C) before any tool/memory implementation.
- **Boundary contract risk:** the Workflow → Planner call must pass a well-formed `BrainContext`; if WP-AI-03B doesn't precisely specify this handoff, it could silently diverge from what `ContextAssemblyService` produces for direct calls.
- **Data lifecycle risk (deferred):** Memory Runtime will eventually need retention/TTL/PII decisions, consistent with the already-flagged outbox TTL gap; not resolved in this ADR, must be resolved before Memory is implemented.
- **Audit volume risk:** N planner-level events + 1 run-level event per agent run increases audit/outbox volume proportionally to workflow step count; worth a capacity check before enabling agents broadly (existing outbox has no purge mechanism per prior audit).

### 6. Readiness for implementation
Architecture is self-consistent, additive, and fully compatible with the certified AI Brain (no breaking changes, all five planners usable unchanged, `ExplainabilityRulesService` remains authoritative). Ready for **WP-AI-03B**: scaffold the seven modules and their dependency-rule enforcement, with no controller/route wiring and no tool/memory logic yet.
