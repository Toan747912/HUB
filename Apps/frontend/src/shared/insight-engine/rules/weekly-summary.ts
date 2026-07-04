import type { Insight, InsightEngineInput } from "../types";
import { daysAgo, evidenceInRange, toDate, totalMinutesInRange } from "./shared";

const RULE_ID = "weekly-summary/last-7-days";

export function weeklySummaryRule(input: InsightEngineInput): Insight | null {
  if (input.sessions.length === 0) return null;

  const start = daysAgo(input.now, 7);
  const end = input.now;

  const minutes = totalMinutesInRange(input.sessions, start, end);

  const completedSessions = input.sessions.filter((s) => {
    const updated = toDate(s.progress?.lastUpdatedAt);
    return (
      s.status === "COMPLETED" &&
      updated &&
      updated.getTime() >= start.getTime() &&
      updated.getTime() < end.getTime()
    );
  }).length;

  const completedActivities = input.sessions
    .flatMap((s) => s.tasks ?? [])
    .filter((t) => {
      const completedAt = toDate(t.completedAt ?? undefined);
      return (
        t.completed &&
        completedAt &&
        completedAt.getTime() >= start.getTime() &&
        completedAt.getTime() < end.getTime()
      );
    }).length;

  const evidenceSubmitted = evidenceInRange(input.sessions, start, end).length;

  const reflectionsCompleted = input.sessions.filter((s) => {
    const recordedAt = toDate(s.reflection?.recordedAt);
    return (
      recordedAt && recordedAt.getTime() >= start.getTime() && recordedAt.getTime() < end.getTime()
    );
  }).length;

  if (minutes === 0 && completedSessions === 0 && evidenceSubmitted === 0) return null;

  return {
    id: "weekly-summary",
    category: "WEEKLY_SUMMARY",
    priority: "LOW",
    title: `This week: ${minutes} minutes studied across ${completedSessions} completed session(s).`,
    reasons: [
      `${completedActivities} activities completed`,
      `${evidenceSubmitted} evidence record(s) submitted`,
      `${reflectionsCompleted} reflection(s) completed`,
    ],
    rulesTriggered: [RULE_ID],
  };
}
