import type { Insight, InsightEngineInput, RoadmapTaskLike } from "../types";

const RULE_ID = "roadmap-insights/milestone-status";

function isBlocked(task: RoadmapTaskLike, allTasksById: Map<string, RoadmapTaskLike>): boolean {
  if (task.completed) return false;
  return (task.dependsOn ?? []).some((depId) => {
    const dep = allTasksById.get(depId);
    return dep ? !dep.completed : false;
  });
}

export function roadmapInsightsRule(input: InsightEngineInput): Insight | null {
  if (input.roadmaps.length === 0) return null;

  const milestones = input.roadmaps.flatMap((r) => r.milestones ?? []);
  if (milestones.length === 0) return null;

  const allTasks = milestones.flatMap((m) => m.tasks ?? []);
  const allTasksById = new Map(allTasks.filter((t) => t.id).map((t) => [t.id as string, t]));

  const completedMilestones = milestones.filter((m) => m.reached).length;
  const blockedMilestones = milestones.filter(
    (m) => !m.reached && (m.tasks ?? []).some((t) => isBlocked(t, allTasksById)),
  ).length;

  const incompleteTasks = allTasks.filter((t) => !t.completed);
  const estimatedRemainingDays = incompleteTasks.reduce(
    (sum, t) => sum + (t.estimatedDurationDays ?? 0),
    0,
  );

  const overallProgress = Math.round(
    (input.roadmaps.reduce((sum, r) => sum + (r.progress?.completionRatio ?? 0), 0) /
      input.roadmaps.length) *
      100,
  );

  const reasons: string[] = [
    `${completedMilestones} of ${milestones.length} milestones completed`,
    `Estimated ${estimatedRemainingDays} day(s) of work remaining`,
  ];
  if (blockedMilestones > 0) {
    reasons.push(`${blockedMilestones} milestone(s) currently blocked by unmet dependencies`);
  }

  return {
    id: "roadmap-insights",
    category: "ROADMAP_PROGRESS",
    priority: blockedMilestones > 0 ? "HIGH" : "MEDIUM",
    title: `Your roadmap is ${overallProgress}% complete.`,
    reasons,
    rulesTriggered: [RULE_ID],
  };
}
