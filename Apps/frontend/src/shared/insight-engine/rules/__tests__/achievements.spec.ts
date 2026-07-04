import { achievementsRule } from "../achievements";
import type { InsightEngineInput, SessionLike } from "../../types";

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

function sevenDayStreakSessions(): SessionLike[] {
  return [
    {
      evidence: Array.from({ length: 7 }, (_, i) => ({ recordedAt: new Date(2026, 5, 26 + i) })),
    },
  ];
}

describe("achievementsRule", () => {
  it("returns null when no thresholds are met", () => {
    expect(achievementsRule(baseInput())).toBeNull();
  });

  it("unlocks the 7-day streak achievement", () => {
    const insight = achievementsRule(baseInput({ sessions: sevenDayStreakSessions() }));
    expect(insight?.reasons).toContain("7-day learning streak");
  });

  it("unlocks roadmap, evidence-count, and completed-session achievements", () => {
    const input = baseInput({
      roadmaps: [{ status: "COMPLETED" }],
      sessions: [
        {
          status: "COMPLETED",
          evidence: Array.from({ length: 100 }, () => ({})),
        },
        ...Array.from({ length: 9 }, () => ({ status: "COMPLETED" })),
      ],
    });

    const insight = achievementsRule(input);
    expect(insight?.reasons).toContain("Completed first roadmap");
    expect(insight?.reasons).toContain("100 evidence records submitted");
    expect(insight?.reasons).toContain("10 completed sessions");
  });
});
