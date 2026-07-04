# Insight Rule Catalog

Sprint 1.3 — Narrative Analytics & Insight Engine

Every rule lives in `Apps/frontend/src/shared/insight-engine/rules/` and is a pure function `(input: InsightEngineInput) => Insight | null`. Thresholds are named constants at the top of each rule file.

## Today's Mission — `todays-mission.ts`

- **Trigger**: at least one `GENERATED` recommendation plan with items.
- **Inputs**: `recommendationPlans`, `assessments` (latest, for `weakAreas`), `roadmaps` (dependent task check), `sessions` (last-reviewed date, suggested minutes).
- **Output**: "Today you should spend approximately {N} minutes reviewing {topic}." + reasons drawn from: confidence decreased on latest assessment, upcoming roadmap tasks depend on this topic, last reviewed N days ago.
- **Thresholds**: `DEFAULT_SUGGESTED_MINUTES = 30`; suggested minutes = avg of last 5 evidence `timeSpent` (seconds → minutes, min 10).

## Learning Progress — `learning-progress.ts`

- **Trigger**: at least one goal or roadmap exists.
- **Inputs**: `goals[].progress.completionRatio`, `roadmaps[].progress.completionRatio`.
- **Output**: "You are {X}% of the way through your current learning plan." + per-source completion averages.

## Learning Consistency — `learning-consistency.ts`

- **Trigger**: at least one session exists.
- **Inputs**: session timers/evidence recorded dates.
- **Output**: streak length, days active in the last 7/30, and a recovery suggestion.
- **Thresholds**: `RECOVERY_STREAK_THRESHOLD = 0`, `RECOVERY_MISSED_DAYS_THRESHOLD = 3`.

## Focus Trend — `focus-trend.ts`

- **Trigger**: at least one evidence record in the last 7 days.
- **Inputs**: `evidence[].focusScore`, split into this-week/last-week windows.
- **Output**: "Your average focus has {improved/declined} by {X}% compared with last week."
- **Thresholds**: decline `<= -10%` escalates priority to `HIGH`.

## Knowledge Growth — `knowledge-growth.ts`

- **Trigger**: at least one assessment with a strong/weak area or (with a prior assessment) an improving/mastered skill.
- **Inputs**: latest + previous assessment `strongAreas`, `weakAreas`, `skillScores`, `competencies`.
- **Output**: strongest skill, most difficult skill, fastest improving skill (+pts), recently mastered topics.
- **Thresholds**: `MASTERY_SCORE_THRESHOLD = 90`.

## Knowledge Gaps — `knowledge-gaps.ts`

- **Trigger**: latest assessment has at least one knowledge gap.
- **Inputs**: `knowledgeGaps[].weight/reason`, incomplete roadmap tasks matching the gap's `skillId`.
- **Output**: "{skill} remains your largest knowledge gap." + remaining dependent task count.
- **Thresholds**: weight rank `CRITICAL=4 > HIGH=3 > MEDIUM/MODERATE=2 > LOW=1`; `HIGH`+ escalates insight priority.

## Recommendation Explanation — `recommendation-explanation.ts`

- **Trigger**: same top-priority `GENERATED` recommendation item as Today's Mission.
- **Output**: structured Why / Evidence / Expected benefit / Dependencies / Confidence breakdown.
- **Thresholds**: `HIGH_CONFIDENCE_THRESHOLD = 70` (confidence ≥ 70 → `MEDIUM` priority, else `LOW`).

## Roadmap Progress — `roadmap-insights.ts`

- **Trigger**: at least one roadmap with milestones.
- **Inputs**: milestone `reached` flags, task `dependsOn`/`completed`/`estimatedDurationDays`.
- **Output**: overall completion %, completed/total milestones, blocked-milestone count, estimated remaining days.
- **Thresholds**: any blocked milestone escalates priority to `HIGH`.

## Weekly Summary — `weekly-summary.ts`

- **Trigger**: any study minutes, completed sessions, or evidence in the last 7 days.
- **Output**: minutes studied, completed sessions, completed activities, evidence submitted, reflections completed.

## Monthly Summary — `monthly-summary.ts`

- **Trigger**: any study minutes in the last 30 days.
- **Output**: total minutes, most active day of week, most productive week, improvement trajectory vs. the prior 30 days.

## Achievement Highlights — `achievements.ts`

- **Trigger**: at least one badge threshold met.
- **Thresholds**: 7-day streak, 1+ completed roadmap, 100+ evidence records, 10+ completed sessions.

## Risk Detection — `risk-detection.ts`

- **Trigger**: any of the signals below fire.
- **Signals & thresholds**:
  - Falling engagement: week-over-week `engagementScore` drop ≥ 10%.
  - Declining focus: week-over-week `focusScore` drop ≥ 10%.
  - Missed roadmap: any milestone blocked by an incomplete dependency.
  - Long inactivity: `≥ 5` days since last active date (marks insight `URGENT`).
  - Repeated failures: last 2 assessments both `NOT_READY` (marks insight `URGENT`).
