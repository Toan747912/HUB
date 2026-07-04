import type { Insight, InsightEngineInput, RecommendationItemLike } from "../types";

const RULE_ID = "recommendation-explanation/top-item-breakdown";
const HIGH_CONFIDENCE_THRESHOLD = 70;

function topItem(input: InsightEngineInput): RecommendationItemLike | null {
  const items = input.recommendationPlans
    .filter((p) => p.status === "GENERATED")
    .flatMap((p) => p.items ?? []);
  if (items.length === 0) return null;
  return [...items].sort(
    (a, b) => (b.scores?.priorityScore ?? 0) - (a.scores?.priorityScore ?? 0),
  )[0];
}

export function recommendationExplanationRule(input: InsightEngineInput): Insight | null {
  const item = topItem(input);
  if (!item) return null;

  const confidence = Math.round(item.scores?.confidenceScore ?? 0);
  const reasons: string[] = [];

  if (item.reason?.summary) reasons.push(`Why: ${item.reason.summary}`);
  if (item.reason?.evidence?.length) reasons.push(`Evidence: ${item.reason.evidence.join(", ")}`);
  if (item.scores?.overallScore !== undefined) {
    reasons.push(
      `Expected benefit: overall impact score ${Math.round(item.scores.overallScore)}/100`,
    );
  }
  const dependencies = [
    item.affectedGoalId,
    item.affectedRoadmapId,
    item.affectedAssessmentId,
  ].filter(Boolean);
  if (dependencies.length > 0) {
    reasons.push(`Dependencies: linked to ${dependencies.length} tracked item(s)`);
  }
  reasons.push(`Confidence: ${confidence}%`);

  return {
    id: "recommendation-explanation",
    category: "RECOMMENDATION_EXPLANATION",
    priority: confidence >= HIGH_CONFIDENCE_THRESHOLD ? "MEDIUM" : "LOW",
    title: "Here's why this recommendation was suggested.",
    reasons,
    rulesTriggered: [RULE_ID],
  };
}
