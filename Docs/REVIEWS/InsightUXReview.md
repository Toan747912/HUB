# Insight UX Review — Sprint 1.3

## Walkthrough

Opening `/dashboard`, the "Today's Mission" card now reads as a sentence with a reason trail ("Recommended because Confidence decreased after the latest assessment · Last reviewed 6 days ago") instead of a bare recommendation summary. Below the existing Goal/Session/Readiness grid and the Adaptive Recommendations + Streak columns, a new "Insights" section renders a grid of cards — each one a category badge, a priority pill, a one-line headline, and 1-3 supporting bullets. A learner scanning top to bottom sees: what to do right now (mission), how they're doing (progress/consistency/focus), what's at risk, and what they've earned — without needing to interpret a single raw percentage on its own.

On `/analytics`, the three existing charts (Focus & Engagement, Study Duration, Roadmap Progression) each gained a one-line narrative caption under the chart itself, generated from the same rules that power the dashboard feed. A "What this means for you" section below the chart grid surfaces the full insight set for learners who want the complete narrative picture rather than just chart captions.

## Known rough edges (deliberate scope choices, not bugs)

- The Analytics charts still render `STUDY_TREND_DATA` mock data — the narrative captions above them are computed from real fetched data, so on accounts with little history the chart and the caption underneath it can visibly disagree. This is a pre-existing gap (the charts were mock before this sprint) and wiring real chart series was out of scope for the Insight Engine itself.
- The Insight feed has no empty-state illustration beyond a single italic line ("No insights yet — complete a study session to start generating them.") — acceptable for a first pass, but a genuinely new learner with zero history will see a fairly bare Insights section on both pages.
- Insights are recomputed on every render via `useMemo` keyed on the fetched arrays; there's no cross-session persistence of "insights the learner already saw," so a dismissed or previously-seen insight will reappear unchanged on the next visit if its trigger condition still holds. Acceptable for a v1 — no dismiss/mute affordance was in scope.
- Category labels and priority badges reuse the existing dark-theme `Card`/`Badge` primitives as-is; no dedicated accessibility pass beyond the `role="article"`/`aria-label` added to `InsightCard` was performed (no screen-reader walkthrough, no color-contrast audit specific to the new priority badge colors).
