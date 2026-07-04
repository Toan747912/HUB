import type { Insight, InsightEngineInput } from "../types";
import { average, daysAgo, evidenceInRange } from "./shared";

const RULE_ID = "focus-trend/week-over-week";

export function focusTrendRule(input: InsightEngineInput): Insight | null {
  const thisWeek = evidenceInRange(input.sessions, daysAgo(input.now, 7), input.now);
  const lastWeek = evidenceInRange(input.sessions, daysAgo(input.now, 14), daysAgo(input.now, 7));

  if (thisWeek.length === 0) return null;

  const thisWeekAvg = average(thisWeek.map((e) => e.focusScore ?? 0));
  const lastWeekAvg = average(lastWeek.map((e) => e.focusScore ?? 0));

  if (lastWeek.length === 0) {
    return {
      id: "focus-trend",
      category: "FOCUS_TREND",
      priority: "LOW",
      title: `Your average focus this week is ${Math.round(thisWeekAvg)}%.`,
      reasons: ["Not enough data from last week to compare a trend yet"],
      rulesTriggered: [RULE_ID],
    };
  }

  const deltaPct = Math.round(thisWeekAvg - lastWeekAvg);
  const direction = deltaPct >= 0 ? "improved" : "declined";

  return {
    id: "focus-trend",
    category: "FOCUS_TREND",
    priority: deltaPct < -10 ? "HIGH" : "LOW",
    title: `Your average focus has ${direction} by ${Math.abs(deltaPct)}% compared with last week.`,
    reasons: [
      `This week's average focus score: ${Math.round(thisWeekAvg)}%`,
      `Last week's average focus score: ${Math.round(lastWeekAvg)}%`,
    ],
    rulesTriggered: [RULE_ID],
  };
}
