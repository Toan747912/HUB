import { learningConsistencyRule } from "../learning-consistency";
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

describe("learningConsistencyRule", () => {
  it("returns null when there are no sessions", () => {
    expect(learningConsistencyRule(baseInput())).toBeNull();
  });

  it("reports an active streak without a recovery suggestion", () => {
    const input = baseInput({
      sessions: [
        {
          evidence: [{ recordedAt: new Date(2026, 6, 2) }, { recordedAt: new Date(2026, 6, 1) }],
        },
      ],
    });

    const insight = learningConsistencyRule(input);
    expect(insight?.title).toBe("You're on a 2-day learning streak.");
    expect(insight?.reasons.some((r) => r.includes("2 of the last 7 days"))).toBe(true);
    expect(insight?.reasons.some((r) => r.includes("Recovery suggestion"))).toBe(false);
    expect(insight?.priority).toBe("MEDIUM");
  });

  it("suggests recovery when the streak is broken and study days are sparse", () => {
    const input = baseInput({
      sessions: [{ evidence: [{ recordedAt: new Date(2026, 5, 20) }] }],
    });

    const insight = learningConsistencyRule(input);
    expect(insight?.title).toContain("reset");
    expect(insight?.priority).toBe("HIGH");
    expect(insight?.reasons.some((r) => r.includes("Recovery suggestion"))).toBe(true);
  });
});
