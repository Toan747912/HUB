import type { Insight, InsightEngineInput, RoadmapTaskLike } from "../types";
import {
  average,
  collectActiveDates,
  daysAgo,
  daysBetween,
  evidenceInRange,
  toDate,
} from "./shared";

const RULE_ID = "risk-detection/multi-signal";
const ENGAGEMENT_DECLINE_THRESHOLD = 10;
const FOCUS_DECLINE_THRESHOLD = 10;
const LONG_INACTIVITY_DAYS = 5;
const REPEATED_FAILURE_COUNT = 2;

function isBlocked(task: RoadmapTaskLike, allTasksById: Map<string, RoadmapTaskLike>): boolean {
  if (task.completed) return false;
  return (task.dependsOn ?? []).some((depId) => {
    const dep = allTasksById.get(depId);
    return dep ? !dep.completed : false;
  });
}

export function riskDetectionRule(input: InsightEngineInput): Insight | null {
  const reasons: string[] = [];
  let hasUrgentSignal = false;

  // Falling engagement
  const thisWeekEvidence = evidenceInRange(input.sessions, daysAgo(input.now, 7), input.now);
  const lastWeekEvidence = evidenceInRange(
    input.sessions,
    daysAgo(input.now, 14),
    daysAgo(input.now, 7),
  );
  if (thisWeekEvidence.length > 0 && lastWeekEvidence.length > 0) {
    const engagementDelta =
      average(thisWeekEvidence.map((e) => e.engagementScore ?? 0)) -
      average(lastWeekEvidence.map((e) => e.engagementScore ?? 0));
    if (engagementDelta <= -ENGAGEMENT_DECLINE_THRESHOLD) {
      reasons.push(
        `Falling engagement: down ${Math.abs(Math.round(engagementDelta))}% vs last week`,
      );
    }

    const focusDelta =
      average(thisWeekEvidence.map((e) => e.focusScore ?? 0)) -
      average(lastWeekEvidence.map((e) => e.focusScore ?? 0));
    if (focusDelta <= -FOCUS_DECLINE_THRESHOLD) {
      reasons.push(`Declining focus: down ${Math.abs(Math.round(focusDelta))}% vs last week`);
    }
  }

  // Missed roadmap (blocked milestones)
  const allTasks = input.roadmaps.flatMap((r) => r.milestones ?? []).flatMap((m) => m.tasks ?? []);
  const allTasksById = new Map(allTasks.filter((t) => t.id).map((t) => [t.id as string, t]));
  const blockedMilestoneCount = input.roadmaps
    .flatMap((r) => r.milestones ?? [])
    .filter((m) => !m.reached && (m.tasks ?? []).some((t) => isBlocked(t, allTasksById))).length;
  if (blockedMilestoneCount > 0) {
    reasons.push(`${blockedMilestoneCount} roadmap milestone(s) blocked by unmet dependencies`);
  }

  // Long inactivity
  if (input.sessions.length > 0) {
    const activeDates = collectActiveDates(input.sessions);
    let mostRecent: Date | null = null;
    for (const dateStr of activeDates) {
      const d = new Date(dateStr);
      if (!mostRecent || d.getTime() > mostRecent.getTime()) mostRecent = d;
    }
    if (mostRecent) {
      const inactiveDays = daysBetween(input.now, mostRecent);
      if (inactiveDays >= LONG_INACTIVITY_DAYS) {
        reasons.push(`No study activity for ${inactiveDays} days`);
        hasUrgentSignal = true;
      }
    }
  }

  // Repeated failures (consecutive NOT_READY assessments)
  const recentAssessments = [...input.assessments]
    .sort((a, b) => (toDate(b.computedAt)?.getTime() ?? 0) - (toDate(a.computedAt)?.getTime() ?? 0))
    .slice(0, REPEATED_FAILURE_COUNT);
  if (
    recentAssessments.length === REPEATED_FAILURE_COUNT &&
    recentAssessments.every((a) => a.readiness === "NOT_READY")
  ) {
    reasons.push(
      `Readiness has stayed "NOT_READY" across the last ${REPEATED_FAILURE_COUNT} assessments`,
    );
    hasUrgentSignal = true;
  }

  if (reasons.length === 0) return null;

  return {
    id: "risk-detection",
    category: "RISK_DETECTION",
    priority: hasUrgentSignal ? "URGENT" : "HIGH",
    title: "Some signals suggest you may be falling behind.",
    reasons,
    rulesTriggered: [RULE_ID],
  };
}
