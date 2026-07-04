import type { Insight, InsightEngineInput } from "../types";
import { computeStreakDays } from "./shared";

const RULE_ID = "achievements/badge-thresholds";
const STREAK_BADGE_DAYS = 7;
const EVIDENCE_BADGE_COUNT = 100;
const COMPLETED_SESSIONS_BADGE_COUNT = 10;

export function achievementsRule(input: InsightEngineInput): Insight | null {
  const unlocked: string[] = [];

  const streakDays = computeStreakDays(input.sessions, input.now);
  if (streakDays >= STREAK_BADGE_DAYS) {
    unlocked.push(`${STREAK_BADGE_DAYS}-day learning streak`);
  }

  const completedRoadmaps = input.roadmaps.filter((r) => r.status === "COMPLETED").length;
  if (completedRoadmaps >= 1) {
    unlocked.push("Completed first roadmap");
  }

  const evidenceCount = input.sessions.flatMap((s) => s.evidence ?? []).length;
  if (evidenceCount >= EVIDENCE_BADGE_COUNT) {
    unlocked.push(`${EVIDENCE_BADGE_COUNT} evidence records submitted`);
  }

  const completedSessions = input.sessions.filter((s) => s.status === "COMPLETED").length;
  if (completedSessions >= COMPLETED_SESSIONS_BADGE_COUNT) {
    unlocked.push(`${COMPLETED_SESSIONS_BADGE_COUNT} completed sessions`);
  }

  if (unlocked.length === 0) return null;

  return {
    id: "achievements",
    category: "ACHIEVEMENT_HIGHLIGHTS",
    priority: "LOW",
    title: `You've unlocked ${unlocked.length} achievement${unlocked.length === 1 ? "" : "s"}.`,
    reasons: unlocked,
    rulesTriggered: [RULE_ID],
  };
}
