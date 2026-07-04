import { focusTrendRule } from "../focus-trend";
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

describe("focusTrendRule", () => {
  it("returns null when there is no evidence this week", () => {
    expect(focusTrendRule(baseInput())).toBeNull();
  });

  it("reports improved focus week-over-week", () => {
    const input = baseInput({
      sessions: [
        {
          evidence: [
            { recordedAt: new Date(2026, 6, 1), focusScore: 80 },
            { recordedAt: new Date(2026, 5, 23), focusScore: 60 },
          ],
        },
      ],
    });

    const insight = focusTrendRule(input);
    expect(insight?.title).toBe("Your average focus has improved by 20% compared with last week.");
    expect(insight?.priority).toBe("LOW");
  });

  it("flags a significant focus decline as high priority", () => {
    const input = baseInput({
      sessions: [
        {
          evidence: [
            { recordedAt: new Date(2026, 6, 1), focusScore: 50 },
            { recordedAt: new Date(2026, 5, 23), focusScore: 70 },
          ],
        },
      ],
    });

    const insight = focusTrendRule(input);
    expect(insight?.title).toBe("Your average focus has declined by 20% compared with last week.");
    expect(insight?.priority).toBe("HIGH");
  });

  it("acknowledges missing prior-week data instead of guessing a trend", () => {
    const input = baseInput({
      sessions: [{ evidence: [{ recordedAt: new Date(2026, 6, 1), focusScore: 80 }] }],
    });

    const insight = focusTrendRule(input);
    expect(insight?.reasons[0]).toContain("Not enough data");
  });
});
