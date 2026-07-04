import type { Insight, InsightEngineInput } from "../types";
import { collectActiveDates, computeStreakDays, daysAgo } from "./shared";

const RULE_ID = "learning-consistency/streak-and-cadence";
const RECOVERY_STREAK_THRESHOLD = 0;
const RECOVERY_MISSED_DAYS_THRESHOLD = 3;

export function learningConsistencyRule(input: InsightEngineInput): Insight | null {
  if (input.sessions.length === 0) return null;

  const activeDates = collectActiveDates(input.sessions);
  const streakDays = computeStreakDays(input.sessions, input.now);

  let weeklyActiveDays = 0;
  for (let i = 0; i < 7; i++) {
    if (activeDates.has(daysAgo(input.now, i).toDateString())) weeklyActiveDays++;
  }
  const missedDaysThisWeek = 7 - weeklyActiveDays;

  let monthlyActiveDays = 0;
  for (let i = 0; i < 30; i++) {
    if (activeDates.has(daysAgo(input.now, i).toDateString())) monthlyActiveDays++;
  }
  const monthlyConsistencyPct = Math.round((monthlyActiveDays / 30) * 100);

  const reasons: string[] = [
    `${weeklyActiveDays} of the last 7 days were active study days`,
    `${monthlyConsistencyPct}% of days in the last 30 were active`,
  ];

  if (
    streakDays <= RECOVERY_STREAK_THRESHOLD &&
    missedDaysThisWeek >= RECOVERY_MISSED_DAYS_THRESHOLD
  ) {
    reasons.push(
      "Recovery suggestion: start with a short 15-minute session today to rebuild momentum",
    );
  }

  return {
    id: "learning-consistency",
    category: "LEARNING_CONSISTENCY",
    priority: streakDays === 0 ? "HIGH" : "MEDIUM",
    title:
      streakDays > 0
        ? `You're on a ${streakDays}-day learning streak.`
        : "Your learning streak has reset — today is a good day to restart it.",
    reasons,
    rulesTriggered: [RULE_ID],
  };
}
