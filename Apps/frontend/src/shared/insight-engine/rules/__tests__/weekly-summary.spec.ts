import { weeklySummaryRule } from "../weekly-summary";
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

describe("weeklySummaryRule", () => {
  it("returns null when there are no sessions", () => {
    expect(weeklySummaryRule(baseInput())).toBeNull();
  });

  it("returns null when nothing happened in the last 7 days", () => {
    const input = baseInput({
      sessions: [{ timers: [{ startedAt: new Date(2026, 5, 1), elapsedSeconds: 600 }] }],
    });
    expect(weeklySummaryRule(input)).toBeNull();
  });

  it("summarizes this week's minutes, sessions, activities, evidence, and reflections", () => {
    const input = baseInput({
      sessions: [
        {
          status: "COMPLETED",
          progress: { lastUpdatedAt: new Date(2026, 6, 1) },
          timers: [{ startedAt: new Date(2026, 6, 1), elapsedSeconds: 1800 }],
          evidence: [{ recordedAt: new Date(2026, 6, 1) }],
          reflection: { recordedAt: new Date(2026, 6, 1), content: "Went well", rating: 4 },
          tasks: [{ completed: true, completedAt: new Date(2026, 6, 1) }],
        },
      ],
    });

    const insight = weeklySummaryRule(input);
    expect(insight?.title).toBe("This week: 30 minutes studied across 1 completed session(s).");
    expect(insight?.reasons).toContain("1 activities completed");
    expect(insight?.reasons).toContain("1 evidence record(s) submitted");
    expect(insight?.reasons).toContain("1 reflection(s) completed");
  });
});
