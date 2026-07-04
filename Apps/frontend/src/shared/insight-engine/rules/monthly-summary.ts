import type { Insight, InsightEngineInput } from "../types";
import { daysAgo, toDate, totalMinutesInRange } from "./shared";

const RULE_ID = "monthly-summary/last-30-days";
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function monthlySummaryRule(input: InsightEngineInput): Insight | null {
  if (input.sessions.length === 0) return null;

  const start = daysAgo(input.now, 30);
  const previousStart = daysAgo(input.now, 60);
  const totalMinutes = totalMinutesInRange(input.sessions, start, input.now);
  const previousMonthMinutes = totalMinutesInRange(input.sessions, previousStart, start);

  if (totalMinutes === 0) return null;

  const minutesByDayOfWeek = new Array(7).fill(0) as number[];
  const minutesByWeek = new Map<number, number>();

  for (const s of input.sessions) {
    for (const t of s.timers ?? []) {
      const started = toDate(t.startedAt);
      if (
        !started ||
        started.getTime() < start.getTime() ||
        started.getTime() > input.now.getTime()
      )
        continue;
      const minutes = Math.round((t.elapsedSeconds || 0) / 60);
      minutesByDayOfWeek[started.getDay()] += minutes;
      const weekIndex = Math.floor(
        (input.now.getTime() - started.getTime()) / (7 * 24 * 60 * 60 * 1000),
      );
      minutesByWeek.set(weekIndex, (minutesByWeek.get(weekIndex) ?? 0) + minutes);
    }
  }

  const mostActiveDayIndex = minutesByDayOfWeek.indexOf(Math.max(...minutesByDayOfWeek));
  const mostProductiveWeekIndex =
    [...minutesByWeek.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;

  const trendPct =
    previousMonthMinutes > 0
      ? Math.round(((totalMinutes - previousMonthMinutes) / previousMonthMinutes) * 100)
      : null;

  const reasons: string[] = [`Most active day: ${DAY_NAMES[mostActiveDayIndex]}`];
  reasons.push(
    `Most productive week: ${mostProductiveWeekIndex === 0 ? "this week" : `${mostProductiveWeekIndex + 1} weeks ago`}`,
  );
  if (trendPct !== null) {
    reasons.push(
      trendPct >= 0
        ? `Improvement trajectory: up ${trendPct}% vs the prior 30 days`
        : `Improvement trajectory: down ${Math.abs(trendPct)}% vs the prior 30 days`,
    );
  }

  return {
    id: "monthly-summary",
    category: "MONTHLY_SUMMARY",
    priority: "LOW",
    title: `You studied ${totalMinutes} minutes over the last 30 days.`,
    reasons,
    rulesTriggered: [RULE_ID],
  };
}
