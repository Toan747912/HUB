import type { Insight, InsightEngineInput } from "../types";
import { average } from "./shared";

const RULE_ID = "learning-progress/goal-roadmap-completion";

export function learningProgressRule(input: InsightEngineInput): Insight | null {
  if (input.goals.length === 0 && input.roadmaps.length === 0) return null;

  const goalCompletion = Math.round(
    average(input.goals.map((g) => (g.progress?.completionRatio ?? 0) * 100)),
  );
  const roadmapCompletion = Math.round(
    average(input.roadmaps.map((r) => (r.progress?.completionRatio ?? 0) * 100)),
  );

  const reasons: string[] = [];
  if (input.goals.length > 0) {
    reasons.push(
      `Goal completion averages ${goalCompletion}% across ${input.goals.length} goal(s)`,
    );
  }
  if (input.roadmaps.length > 0) {
    reasons.push(
      `Roadmap completion averages ${roadmapCompletion}% across ${input.roadmaps.length} roadmap(s)`,
    );
  }

  const headline = input.goals.length > 0 ? goalCompletion : roadmapCompletion;

  return {
    id: "learning-progress",
    category: "LEARNING_PROGRESS",
    priority: "MEDIUM",
    title: `You are ${headline}% of the way through your current learning plan.`,
    reasons,
    rulesTriggered: [RULE_ID],
  };
}
