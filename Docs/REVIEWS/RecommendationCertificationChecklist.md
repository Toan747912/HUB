# Recommendation Certification Checklist

WP-06A — Batch 12: Recommendation Intelligence Engine

Legend: ✅ done and verified by an automated test · ☑ done, verified by build/inspection (no dedicated test) · ⚠ partial / deliberate scope limitation

## Domain Model

- ✅ Aggregate Root `Recommendation`
- ✅ Entities: `RecommendationItem`, `RecommendationReason`, `LearningStrategy` (as `LearningStrategyAssignment`), `ReviewSchedule`, `PriorityDecision`, `RecommendationHistory`
- ✅ Value Objects: `RecommendationType`, `RecommendationPriority`, `RecommendationConfidence`, `RecommendationStatus`

## Decision Engine (`RecommendationEngine`)

- ✅ Priority Scoring
- ✅ Dependency Analysis
- ✅ Gap Resolution
- ✅ Adaptive Difficulty
- ✅ Review Scheduling
- ✅ Task Reordering Suggestions
- ✅ Roadmap Adjustment Suggestions
- ✅ Learning Strategy Selection

## Scoring Model

- ✅ Priority Score
- ✅ Need Score
- ✅ Urgency Score
- ✅ Difficulty Score
- ✅ Confidence Score
- ✅ Risk Score
- ✅ Overall Recommendation Score
- ✅ All formulas deterministic — confirmed by the determinism test (identical input → identical scores)

## Decision Rules

- ✅ Reproducible: same inputs → same outputs (dedicated test, full object-equality assertion)
- ✅ Every recommendation includes Reason (summary + evidence array)
- ✅ Every recommendation includes Evidence
- ✅ Every recommendation includes Score (full 7-value `RecommendationScores`)
- ✅ Every recommendation includes Affected Goal (`affectedGoalId`)
- ✅ Every recommendation includes Affected Roadmap (`affectedRoadmapId`)
- ✅ Every recommendation includes Affected Assessment (`affectedAssessmentId`)

## Learning Strategies (all 8 required, all individually tested)

- ✅ Review
- ✅ Practice
- ✅ Advance
- ✅ Slow Down
- ✅ Skip
- ✅ Repeat
- ✅ Deep Dive
- ✅ Recovery

## Application

- ✅ Commands: `GenerateRecommendations`, `ApproveRecommendation`, `RejectRecommendation`, `ArchiveRecommendation`
- ✅ Queries: `GetRecommendations`, `GetRecommendation`, `GetRecommendationHistory`, `GetLearningStrategies`

## Events

- ✅ `RecommendationGenerated`
- ✅ `RecommendationApproved`
- ✅ `RecommendationRejected`
- ✅ `RecommendationArchived`
- ✅ `LearningStrategyChanged`

## API

- ✅ `POST /recommendation/generate`
- ✅ `GET /recommendation`
- ✅ `GET /recommendation/:id`
- ✅ `POST /recommendation/:id/approve`
- ✅ `POST /recommendation/:id/reject`
- ✅ `DELETE /recommendation/:id`
- ✅ `GET /recommendation/strategies`
- ☑ `GET /recommendation/:id/history` — additional endpoint; the spec's query list requires `GetRecommendationHistory` but its API section lists no URL for it

## Observability

- ✅ Metric `recommendation_generated_total`
- ✅ Metric `recommendation_duration`
- ✅ Metric `recommendation_confidence_average`
- ✅ Metric `strategy_distribution_total`
- ✅ Metric `priority_score_average`

## RBAC

- ✅ `Recommendation.Read`
- ✅ `Recommendation.Generate`
- ✅ `Recommendation.Approve`
- ✅ `Recommendation.Reject`
- ✅ `Recommendation.Archive`

## Testing

- ✅ Deterministic outputs
- ✅ Priority scoring (bounds + monotonic response to worsening need/urgency/risk signals)
- ✅ Gap handling (review schedule present/absent)
- ✅ Difficulty adjustment (increase/decrease/no-op)
- ✅ Review scheduling (interval mapped from gap weight, due date computed from an explicit reference date)
- ✅ Strategy selection (all 8 strategies individually)
- ✅ Roadmap adjustment logic (all 3 triggers individually + the healthy no-op case)
- ✅ RBAC (TEACHER/STUDENT boundary tests for all 5 permissions)
- ✅ Validation (DTO-level class-validator tests: UUID, ratio/score bounds, non-empty array, malformed nested object, invalid date, negative integer)
- ✅ Event emission (order and payload asserted at both the aggregate and command-service layers)

## Constraints Compliance

- ✅ No LLM — confirmed, zero LLM client imports anywhere in `modules/recommendation`
- ✅ No embeddings — confirmed, no vector/embedding library imports
- ✅ No vector databases — confirmed, only the existing MongoDB connection is used
- ✅ No prompt generation — confirmed, no prompt-construction code exists in this module
- ✅ No external AI services — confirmed, the engine's only inputs are the `RecommendationInput` fields passed in by the caller
- ✅ Fully deterministic and explainable — confirmed by the determinism test and the explainability test (every item carries reason + evidence + scores)
- ✅ Every recommendation includes reasoning and scoring evidence — confirmed
- ✅ No hidden decision logic — confirmed: every score and every strategy-selection branch is a named, independently unit-tested private method with no unexplained magic numbers left un-narrated in the implementation report

## Test Suite Health (full repo)

- ✅ `npm run build` (tsc) — clean, zero errors
- ✅ `npx jest` — 322/322 tests passing across 54 suites (includes all pre-existing Goal/Roadmap/Assessment/Discovery/Audit/RBAC/Outbox suites — no regressions)
