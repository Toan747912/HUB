# WP-AI-02 Phase 2 — Confidence Standardization

**Scope:** every `confidence` value produced or consumed by the AI Brain (five planners, `BasePlannerService`, `ExplainabilityRulesService`, `MetricsService`) and the pre-existing domain modules that also carry a confidence concept (recommendation, assessment).

## Audit

Two representations existed in the repository:

1. **Raw float in `[0, 1]`** — used everywhere a confidence value is actually produced or consumed:
   - `BasePlannerService.normalizeConfidence()` (`Apps/ai-backend/src/infrastructure/ai-brain/base-planner.service.ts`) clamps LLM output into `[0,1]`.
   - `BasePlanResponse.confidence: number` and every planner contract (`mission-planner.contracts.ts`, `discovery-planner.contracts.ts`, `knowledge-planner.contracts.ts`, `evidence-planner.contracts.ts`, `teaching-planner.contracts.ts`) type it as `number`.
   - `ExplainabilityRulesService.validate()` (`Apps/ai-backend/src/shared/services/explainability-rules.service.ts`) requires `confidence` to be a `number` in `[0,1]`.
   - `MetricsService` — every `record*PlanConfidence(score: number)` method, plus the new Phase 3 `recordPlannerOutcome({ confidence?: number, ... })`.
   - `AiRuntimeService.normalizeConfidence()` (legacy non-planner path) — a second, independent clamp-to-`[0,1]` implementation.
   - `recommendation.engine.ts` / `recommendation.aggregate.ts` (`overallConfidence`, `averageConfidence`) and `assessment.engine.ts` (`estimateConfidence`) — same `[0,1]` float convention.
   - `MockLlmClientService` — mock LLM output hardcodes `confidence: 0.86`.

2. **`Confidence` value object** (`Apps/ai-backend/src/shared/domain/vocabulary/confidence.vo.ts`) — a `0–100` integer-scale class whose doc comment claimed it replaced duplicated `ConfidenceScore`/`RecommendationConfidence` types. A repo-wide search found **zero importers**: nothing in the planners, the recommendation module, the assessment module, or any test constructed or consumed it. It was dead code, on an incompatible scale (0–100 vs 0–1) from every live confidence value in the system.

## Decision

**Canonical representation: raw `number` in `[0, 1]`.**

Rationale:
- It is the representation already flowing through the entire live pipeline — LLM gateway output, planner responses, explainability validation, metrics, and audit events. Adopting the VO's 0–100 scale instead would require touching every one of those call sites for zero behavioral benefit.
- The VO had no callers to migrate, so keeping it would only leave a second, conflicting representation sitting unused in `shared/domain/vocabulary/` — a trap for a future contributor who finds it and assumes it's the "real" one.

**Action taken:** deleted `Apps/ai-backend/src/shared/domain/vocabulary/confidence.vo.ts` (dead code, zero importers, confirmed via `grep -rn "from '.*confidence.vo'"` across `src/`, no matches). No adapter was needed — there was nothing consuming the VO's `[0,100]` scale to adapt away from.

**No dual representation remains.** Every confidence value in the codebase after this change is a plain `number` in `[0,1]`, normalized at the one boundary where untrusted input enters the system: `BasePlannerService.normalizeConfidence()` for planner/LLM output.

## Constraints honored

- No API/contract changes: `BasePlanResponse.confidence` and all five planner contracts already typed `confidence: number`; nothing changed shape.
- No planner logic changes: `normalizeConfidence()`, `buildLlmResponse()`, `buildFallbackResponse()` in all five planners are untouched.
- No behavior change: the deleted VO was never invoked at runtime, so removing it cannot change any code path's output.
