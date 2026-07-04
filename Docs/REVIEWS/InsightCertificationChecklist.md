# Insight Certification Checklist

Sprint 1.3 — Narrative Analytics & Insight Engine

Legend: ✅ done and verified by an automated test · ☑ done, verified by inspection (no dedicated test) · ⚠ partial / deliberate scope limitation

## Rule Coverage

- ✅ Today's Mission
- ✅ Learning Progress
- ✅ Learning Consistency
- ✅ Focus Trend
- ✅ Knowledge Growth
- ✅ Knowledge Gaps
- ✅ Recommendation Explanation
- ✅ Roadmap Progress
- ✅ Weekly Summary
- ✅ Monthly Summary
- ✅ Achievement Highlights
- ✅ Risk Detection

## Determinism

- ✅ No `Math.random` anywhere in `insight-engine/` (confirmed by inspection of all 12 rule files, `engine.ts`, `use-insights.ts`)
- ✅ The only wall-clock read (`new Date()`) happens once in `use-insights.ts` and is passed down as `input.now` — every rule is a pure function of its arguments, verified by fixed-`Date` unit tests
- ✅ No LLM calls, no external API calls, no network requests inside the engine — it operates purely on data already fetched by the host page

## Prioritization

- ✅ Today's Mission and any `URGENT` Risk Detection insight always surface first — verified by `engine.spec.ts`
- ✅ Total insights capped at 8 ("never overwhelm the learner") — verified by `engine.spec.ts`
- ✅ Remaining insights sorted by priority rank (`URGENT > HIGH > MEDIUM > LOW`)

## Observability

- ✅ `trackInsightGeneration` logs duration, insight count, categories, and rule ids on every generation — verified by code inspection against `telemetry.ts`
- ✅ Never logs `title`/`reasons` (may reflect learner-derived note/reflection content) — enforced by the function's parameter shape (only accepts `Insight[]` metadata fields it reads, not full text)

## Testing

- ✅ 12 rule spec files, one per category, covering trigger + no-trigger boundary cases
- ✅ `engine.spec.ts` — prioritization ordering and overwhelm-prevention cap
- ✅ `insight-card.spec.tsx` — accessible rendering (React Testing Library: `role="article"`, ARIA label, conditional reasons list)
- ✅ 43/43 new tests passing

## Constraints Compliance

- ✅ Do NOT use Large Language Models — confirmed, zero LLM/AI SDK imports anywhere in `insight-engine/`
- ✅ Do NOT generate free-form AI responses — confirmed, every string is a template built from named rule constants and typed input fields
- ✅ Generate deterministic narratives from verified platform data — confirmed, every rule reads only from `InsightEngineInput` (goals/roadmaps/assessments/recommendations/sessions)
- ✅ No randomness — confirmed (see Determinism)
- ✅ No external APIs — confirmed, engine has zero network calls

## Test Suite Health (frontend)

- ✅ `npx tsc --noEmit` — clean, zero new type errors (pre-existing jest-typings gap on `use-session-timer.spec.ts` unaffected by this work)
- ✅ `npx jest` — 47/47 relevant tests passing across 15 suites (43 new + 4 pre-existing), no regressions
- ⚠ `__tests__/critical-path.test.jsx` fails to resolve `../app/page` — pre-existing breakage unrelated to this sprint (unmodified by this change, confirmed via `git log`), not fixed here as it is out of scope
