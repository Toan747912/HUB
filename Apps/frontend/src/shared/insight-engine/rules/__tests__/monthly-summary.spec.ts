import { monthlySummaryRule } from "../monthly-summary";
import type { InsightEngineInput } from "../../types";

const NOW = new Date(2026, 6, 2, 12, 0, 0);

function baseInput(overrides: Partial<InsightEngineInput> = {}): InsightEngineInput {
  return {
    now: NOW,
    goals: [],
    roadmaps: [],
    assessments: [],
    recommendationPlans: [],
    sessions: [],
    ...overrides,
  };
}

describe("monthlySummaryRule", () => {
  it("returns null when there is no activity in the last 30 days", () => {
    expect(monthlySummaryRule(baseInput())).toBeNull();
  });

  it("reports total minutes, most active day, and most productive week", () => {
    const input = baseInput({
      sessions: [{ timers: [{ startedAt: new Date(2026, 6, 1), elapsedSeconds: 1800 }] }],
    });

    const insight = monthlySummaryRule(input);
    expect(insight?.title).toBe("You studied 30 minutes over the last 30 days.");
    expect(insight?.reasons.some((r) => /^Most active day: \w+$/.test(r))).toBe(true);
    expect(insight?.reasons).toContain("Most productive week: this week");
  });

  it("reports an improvement trajectory against the prior 30 days", () => {
    const input = baseInput({
      sessions: [
        { timers: [{ startedAt: new Date(2026, 6, 1), elapsedSeconds: 3600 }] }, // this month: 60 min
        { timers: [{ startedAt: new Date(2026, 4, 10), elapsedSeconds: 1800 }] }, // prior month: 30 min
      ],
    });

    const insight = monthlySummaryRule(input);
    expect(insight?.reasons).toContain("Improvement trajectory: up 100% vs the prior 30 days");
  });
});
