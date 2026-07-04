import * as React from "react";
import { generateInsights } from "./engine";
import { trackInsightGeneration } from "./telemetry";
import type {
  AssessmentLike,
  GoalLike,
  Insight,
  RecommendationPlanLike,
  RoadmapLike,
  SessionLike,
} from "./types";

interface UseInsightsArgs {
  goals?: GoalLike[];
  roadmaps?: RoadmapLike[];
  assessments?: AssessmentLike[];
  recommendationPlans?: RecommendationPlanLike[];
  sessions?: SessionLike[];
}

export function useInsights({
  goals = [],
  roadmaps = [],
  assessments = [],
  recommendationPlans = [],
  sessions = [],
}: UseInsightsArgs): Insight[] {
  return React.useMemo(() => {
    const start = performance.now();
    const insights = generateInsights({
      now: new Date(),
      goals,
      roadmaps,
      assessments,
      recommendationPlans,
      sessions,
    });
    trackInsightGeneration(insights, performance.now() - start);
    return insights;
  }, [goals, roadmaps, assessments, recommendationPlans, sessions]);
}
