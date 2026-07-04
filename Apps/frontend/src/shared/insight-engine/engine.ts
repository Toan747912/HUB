import type { Insight, InsightEngineInput } from "./types";
import { achievementsRule } from "./rules/achievements";
import { focusTrendRule } from "./rules/focus-trend";
import { knowledgeGapsRule } from "./rules/knowledge-gaps";
import { knowledgeGrowthRule } from "./rules/knowledge-growth";
import { learningConsistencyRule } from "./rules/learning-consistency";
import { learningProgressRule } from "./rules/learning-progress";
import { monthlySummaryRule } from "./rules/monthly-summary";
import { recommendationExplanationRule } from "./rules/recommendation-explanation";
import { riskDetectionRule } from "./rules/risk-detection";
import { roadmapInsightsRule } from "./rules/roadmap-insights";
import { todaysMissionRule } from "./rules/todays-mission";
import { weeklySummaryRule } from "./rules/weekly-summary";

const MAX_TOTAL_INSIGHTS = 8;
const PRIORITY_RANK: Record<Insight["priority"], number> = {
  URGENT: 3,
  HIGH: 2,
  MEDIUM: 1,
  LOW: 0,
};

const ALL_RULES = [
  todaysMissionRule,
  riskDetectionRule,
  learningConsistencyRule,
  learningProgressRule,
  focusTrendRule,
  knowledgeGapsRule,
  knowledgeGrowthRule,
  recommendationExplanationRule,
  roadmapInsightsRule,
  weeklySummaryRule,
  monthlySummaryRule,
  achievementsRule,
];

/**
 * Runs every deterministic rule and returns a prioritized, capped insight list.
 * Today's Mission and any URGENT risk-detection insight always surface first.
 */
export function generateInsights(input: InsightEngineInput): Insight[] {
  const results = ALL_RULES.map((rule) => rule(input)).filter(
    (insight): insight is Insight => insight !== null,
  );

  const always = results.filter((i) => i.category === "TODAYS_MISSION" || i.priority === "URGENT");
  const rest = results
    .filter((i) => !(i.category === "TODAYS_MISSION" || i.priority === "URGENT"))
    .sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);

  return [...always, ...rest].slice(0, MAX_TOTAL_INSIGHTS);
}
