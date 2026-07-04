import type { Insight, InsightEngineInput, RecommendationItemLike } from "../types";
import { daysBetween, toDate } from "./shared";

const DEFAULT_SUGGESTED_MINUTES = 30;
const RULE_ID = "todays-mission/top-recommendation";

function suggestedMinutes(input: InsightEngineInput): number {
  const recent = input.sessions
    .flatMap((s) => s.evidence ?? [])
    .filter((e) => typeof e.timeSpent === "number" && e.timeSpent > 0)
    .slice(-5);
  if (recent.length === 0) return DEFAULT_SUGGESTED_MINUTES;
  const avgSeconds = recent.reduce((sum, e) => sum + (e.timeSpent ?? 0), 0) / recent.length;
  return Math.max(10, Math.round(avgSeconds / 60));
}

function lastReviewedDaysAgo(
  input: InsightEngineInput,
  skillId: string | null | undefined,
): number | null {
  if (!skillId) return null;
  let latest: Date | null = null;
  for (const session of input.sessions) {
    if (session.skillId !== skillId) continue;
    for (const e of session.evidence ?? []) {
      const d = toDate(e.recordedAt);
      if (d && (!latest || d.getTime() > latest.getTime())) latest = d;
    }
  }
  if (!latest) return null;
  return daysBetween(input.now, latest);
}

function hasDependentRoadmapTasks(
  input: InsightEngineInput,
  skillId: string | null | undefined,
): boolean {
  if (!skillId) return false;
  const relatedTaskIds = new Set(
    input.roadmaps
      .flatMap((r) => r.milestones ?? [])
      .flatMap((m) => m.tasks ?? [])
      .filter((t) => t.skillId === skillId)
      .map((t) => t.id)
      .filter((id): id is string => Boolean(id)),
  );
  if (relatedTaskIds.size === 0) return false;
  return input.roadmaps
    .flatMap((r) => r.milestones ?? [])
    .flatMap((m) => m.tasks ?? [])
    .some((t) => !t.completed && (t.dependsOn ?? []).some((dep) => relatedTaskIds.has(dep)));
}

function topRecommendationItem(input: InsightEngineInput): RecommendationItemLike | null {
  const items = input.recommendationPlans
    .filter((p) => p.status === "GENERATED")
    .flatMap((p) => p.items ?? []);
  if (items.length === 0) return null;
  return [...items].sort(
    (a, b) => (b.scores?.priorityScore ?? 0) - (a.scores?.priorityScore ?? 0),
  )[0];
}

export function todaysMissionRule(input: InsightEngineInput): Insight | null {
  const item = topRecommendationItem(input);
  if (!item) return null;

  const skillId = item.skillId ?? null;
  const topic = skillId ?? item.reason?.summary ?? "your next priority";
  const minutes = suggestedMinutes(input);
  const reasons: string[] = [];

  const latestAssessment = [...input.assessments].sort(
    (a, b) => (toDate(b.computedAt)?.getTime() ?? 0) - (toDate(a.computedAt)?.getTime() ?? 0),
  )[0];
  if (skillId && latestAssessment?.weakAreas?.includes(skillId)) {
    reasons.push("Confidence decreased after the latest assessment");
  }
  if (hasDependentRoadmapTasks(input, skillId)) {
    reasons.push("Upcoming roadmap tasks depend on this topic");
  }
  const lastReviewed = lastReviewedDaysAgo(input, skillId);
  if (lastReviewed !== null) {
    reasons.push(`Last reviewed ${lastReviewed} day${lastReviewed === 1 ? "" : "s"} ago`);
  }
  if (reasons.length === 0 && item.reason?.summary) {
    reasons.push(item.reason.summary);
  }

  return {
    id: "todays-mission",
    category: "TODAYS_MISSION",
    priority: "HIGH",
    title: `Today you should spend approximately ${minutes} minutes reviewing ${topic}.`,
    reasons,
    rulesTriggered: [RULE_ID],
  };
}
