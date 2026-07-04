import { learningProgressRule } from "../learning-progress";
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

describe("learningProgressRule", () => {
  it("returns null when there are no goals or roadmaps", () => {
    expect(learningProgressRule(baseInput())).toBeNull();
  });

  it("reports averaged goal and roadmap completion percentages", () => {
    const input = baseInput({
      goals: [{ progress: { completionRatio: 0.6 } }, { progress: { completionRatio: 0.8 } }],
      roadmaps: [{ progress: { completionRatio: 0.5 } }],
    });

    const insight = learningProgressRule(input);
    expect(insight?.title).toContain("70%");
    expect(insight?.reasons).toContain("Goal completion averages 70% across 2 goal(s)");
    expect(insight?.reasons).toContain("Roadmap completion averages 50% across 1 roadmap(s)");
  });
});
