import type { Insight, InsightEngineInput } from "../types";
import { toDate } from "./shared";

const RULE_ID = "knowledge-gaps/largest-weighted-gap";

const WEIGHT_RANK: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  MODERATE: 2,
  LOW: 1,
};

function weightRank(weight: string | undefined): number {
  if (!weight) return 0;
  return WEIGHT_RANK[weight.toUpperCase()] ?? 0;
}

function remainingTasksForSkill(input: InsightEngineInput, skillId: string): number {
  return input.roadmaps
    .flatMap((r) => r.milestones ?? [])
    .flatMap((m) => m.tasks ?? [])
    .filter((t) => t.skillId === skillId && !t.completed).length;
}

export function knowledgeGapsRule(input: InsightEngineInput): Insight | null {
  const latest = [...input.assessments].sort(
    (a, b) => (toDate(b.computedAt)?.getTime() ?? 0) - (toDate(a.computedAt)?.getTime() ?? 0),
  )[0];
  if (!latest || !latest.knowledgeGaps || latest.knowledgeGaps.length === 0) return null;

  const largestGap = [...latest.knowledgeGaps].sort(
    (a, b) => weightRank(b.weight) - weightRank(a.weight),
  )[0];
  if (!largestGap?.skillId) return null;

  const remainingTasks = remainingTasksForSkill(input, largestGap.skillId);
  const reasons: string[] = [];
  if (largestGap.reason) reasons.push(largestGap.reason);
  if (remainingTasks > 0) {
    reasons.push(
      `Completing ${remainingTasks} more roadmap task${remainingTasks === 1 ? "" : "s"} is expected to improve your readiness for upcoming milestones`,
    );
  }

  return {
    id: "knowledge-gaps",
    category: "KNOWLEDGE_GAPS",
    priority: weightRank(largestGap.weight) >= WEIGHT_RANK.HIGH ? "HIGH" : "MEDIUM",
    title: `${largestGap.skillId} remains your largest knowledge gap.`,
    reasons,
    rulesTriggered: [RULE_ID],
  };
}
