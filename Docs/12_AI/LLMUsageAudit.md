# WP-AI-02 Phase 5 — LLM Usage Audit

**Goal:** verify there are no direct LLM calls anywhere in `Apps/ai-backend/src` outside `ResilientLlmGateway`.

**Method:** repo-wide search across `Apps/ai-backend/src` (excluding `coverage/`) for:
- LLM SDK / vendor references: `openai`, `anthropic`, `@anthropic-ai`, `chat/completions`, `generateContent`, `createChatCompletion` — case-insensitive.
- Raw network calls that could reach an LLM endpoint: `fetch(`, `axios.`, `http.request`, `https.request`.
- Every constructor-injected reference to `MockLlmClientService` (the only concrete "LLM" implementation in this codebase — there is no real vendor SDK integrated yet) and every call to `ResilientLlmGateway.complete()`.

## Findings

| File | Reason checked | Status |
| --- | --- | --- |
| `Apps/ai-backend/src/infrastructure/ai-brain/resilient-llm-gateway.service.ts` | This is the designated gateway. Its own doc comment states it is "the only path any AI capability may use to reach an LLM provider." Wraps `MockLlmClientService.complete()` with circuit-breaker (`RedisCircuitBreakerService`) and an 8s timeout race. | PASS (by definition) |
| `Apps/ai-backend/src/infrastructure/llm/mock-llm-client.service.ts` | The concrete "LLM" implementation. No network call — hardcoded in-memory mock. Injected into and called exclusively by `ResilientLlmGateway` (`resilient-llm-gateway.service.ts` constructor). | PASS — only reachable through the gateway |
| Five planner services (`mission-planner.service.ts`, `discovery-planner.service.ts`, `knowledge-planner.service.ts`, `evidence-planner.service.ts`, `teaching-planner.service.ts`) | All reach the LLM exclusively through `BasePlannerService.execute()` → `this.llmGateway.complete(...)`. Confirmed by `planner-contract-audit.ts` (`USES_RESILIENT_LLM_GATEWAY` check, all 5 PASS — see `PlannerContractReport.md`). | PASS |
| `Apps/ai-backend/src/modules/ai-runtime/ai-runtime.service.ts:272` | `callLlmWithResilience()` calls `this.llm.complete(prompt)` directly, where `this.llm` is `MockLlmClientService` injected straight into `AiRuntimeService` — **not** routed through `ResilientLlmGateway`. This method also reimplements its own circuit breaker inline (`isCircuitOpen()` at line 289, `llmFailureCount`/`circuitOpenUntil` fields, in-memory only, not Redis-backed) instead of using `RedisCircuitBreakerService`. This is the legacy, pre-planner code path still used for the non-planner `DomainRoute`s (`goal`, `roadmap`, `learning_session`, etc.) — `isPlannerCapability()` routes the five planner capabilities away from this method and into the planners' own `BasePlannerService`/`ResilientLlmGateway` path. | **FAIL** (direct LLM call bypassing the gateway) |
| Repo-wide search for `openai\|anthropic\|@anthropic-ai\|chat/completions\|generateContent\|createChatCompletion` | No real LLM vendor SDK is integrated anywhere in this codebase yet — `MockLlmClientService` is a stub. | PASS (nothing to find) |
| Repo-wide search for `fetch(\|axios\.\|http\.request\|https\.request` | Zero matches in `Apps/ai-backend/src`. | PASS |

## Disposition of the one FAIL

`AiRuntimeService`'s legacy `callLlmWithResilience()` path predates the AI Brain planner architecture and is explicitly out of scope for this work package:

> "Do NOT redesign architecture. Do NOT introduce new planners. Do NOT add new modules... No runtime redesign." — WP-AI-02 constraints.

Rerouting this method through `ResilientLlmGateway` would change `AiRuntimeService`'s behavior (different circuit-breaker backend — Redis vs. in-memory — different thresholds/cooldowns, different timeout handling) for every non-planner `DomainRoute` it serves, which is a runtime/architecture change, not a hardening change. It is reported here as a known, pre-existing architectural gap rather than silently passed or fixed under this WP.

**Recommendation for a future work package:** migrate `AiRuntimeService`'s non-planner routes onto `ResilientLlmGateway` (mirroring what the five planners already do), then delete the duplicated in-memory circuit breaker (`llmFailureCount`, `circuitOpenUntil`, `isCircuitOpen()`) in favor of `RedisCircuitBreakerService`. This closes the only outstanding "direct LLM call outside the gateway" gap in the codebase.

## Summary

- **Planner surface (Mission/Discovery/Knowledge/Evidence/Teaching): 100% compliant.** Every planner reaches the LLM exclusively through `ResilientLlmGateway`.
- **Legacy `AiRuntimeService` non-planner routes: non-compliant**, calling the mock LLM client directly with its own duplicate circuit breaker. Pre-existing, out of scope to fix under "hardening only," flagged for follow-up.
