# Narrative Analytics Implementation Report

Sprint 1.3 — Narrative Analytics & Insight Engine

## 1. Scope Delivered

A frontend-only, deterministic Insight Engine (`Apps/frontend/src/shared/insight-engine/`) that converts already-fetched Goal/Roadmap/Assessment/Recommendation/LearningSession data into 12 categories of plain-language, rule-based narratives, surfaced on the Dashboard and Analytics pages. No LLM calls, no randomness, no external APIs — every insight traces back to an explicit business rule over data the frontend already holds in memory.

## 2. Rule Catalog Summary

Twelve pure rule functions (`rules/*.ts`), one per spec category: Today's Mission, Learning Progress, Learning Consistency, Focus Trend, Knowledge Growth, Knowledge Gaps, Recommendation Explanation, Roadmap Progress, Weekly Summary, Monthly Summary, Achievement Highlights, Risk Detection. Each rule is `(input: InsightEngineInput) => Insight | null` — returns `null` when its trigger conditions aren't met, so the engine only ever surfaces insights backed by real signal. Full trigger conditions and thresholds are catalogued in `InsightRuleCatalog.md`.

## 3. Engine & Prioritization

`engine.ts#generateInsights` runs all 12 rules, drops nulls, and applies the "never overwhelm the learner" rule from the spec:
- Today's Mission and any `URGENT`-priority Risk Detection insight always surface first (in rule-execution order).
- Remaining insights are sorted by priority (`URGENT > HIGH > MEDIUM > LOW`) and the whole list is capped at 8 total insights.

## 4. Frontend Integration

- **Dashboard** (`app/(authenticated)/dashboard/page.tsx`): the existing "Today's Mission" card now renders the `TODAYS_MISSION` insight's title/reasons instead of raw recommendation-item fields; the ad-hoc `computeStreakDays`/`computeWeeklyMinutes` helpers were replaced with the engine's shared `computeStreakDays`/`totalMinutesInRange` utilities (reused, not reimplemented); a new "Insights" feed renders the remaining triggered categories via `InsightFeed`.
- **Analytics** (`app/(authenticated)/analytics/page.tsx`): now fetches goals/roadmaps/assessments/sessions/recommendations via react-query (previously chart-only, no data fetching) and shows a one-line narrative caption under the Focus & Engagement, Study Duration, and Roadmap Progression charts, plus a full "What this means for you" `InsightFeed` section below the charts.
- **Components**: `components/insights/insight-card.tsx` and `insight-feed.tsx` render `Insight` objects using existing `Card`/`Badge` primitives — no new design system introduced.

## 5. Observability

`telemetry.ts#trackInsightGeneration` logs `durationMs`, insight count, triggered categories, and rule ids on every `generateInsights` call — mirroring the existing `trackWorkspaceEvent` pattern in `learning-sessions/lib/telemetry.ts`. It intentionally never logs `title` or `reasons`, since those may reflect derived learner note/reflection content.

## 6. Testing

- One `*.spec.ts` per rule (12 files) covering trigger and no-trigger boundary conditions with fixed `Date` fixtures.
- `engine.spec.ts` verifies prioritization ordering (Today's Mission + URGENT risk first) and the 8-insight cap.
- `insight-card.spec.tsx` (React Testing Library) verifies accessible rendering (`role="article"`, labelled by category) and conditional reasons list.
- 43 new tests, all passing; full frontend suite run confirms no regressions (see `InsightCertificationChecklist.md`).

## 7. Deliberate Scope Boundaries

- Chart datasets on the Analytics page remain the pre-existing `STUDY_TREND_DATA` mock array — rewiring the charts themselves to live data is a pre-existing gap unrelated to this sprint and was not touched.
- The generated API client (`shared/services/api/client.ts`) returns untyped `any` for every read endpoint; the Insight Engine defines its own frontend-side "Like" presentation types (`types.ts`) rather than waiting on backend DTO typing, since fixing the client's codegen is out of scope here.
- The weekly activity heatmap widget on the Dashboard is left as a visual-only helper (`computeWeeklyHeatmap`) since it is a calendar grid, not a narrative — it isn't one of the 12 spec categories.
