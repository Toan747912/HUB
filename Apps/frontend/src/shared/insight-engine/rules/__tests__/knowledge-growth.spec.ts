import { knowledgeGrowthRule } from "../knowledge-growth";
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

describe("knowledgeGrowthRule", () => {
  it("returns null when there are no assessments", () => {
    expect(knowledgeGrowthRule(baseInput())).toBeNull();
  });

  it("surfaces strongest skill, most difficult skill, fastest improvement, and recent mastery", () => {
    const input = baseInput({
      assessments: [
        {
          computedAt: new Date(2026, 6, 1),
          strongAreas: ["dynamic-programming"],
          weakAreas: ["graphs"],
          skillScores: [{ skillId: "dynamic-programming", rawScore: 90 }],
          competencies: [{ skillId: "arrays", score: 95 }],
        },
        {
          computedAt: new Date(2026, 5, 1),
          skillScores: [{ skillId: "dynamic-programming", rawScore: 70 }],
          competencies: [{ skillId: "arrays", score: 80 }],
        },
      ],
    });

    const insight = knowledgeGrowthRule(input);
    expect(insight?.title).toBe("dynamic-programming is your strongest skill right now.");
    expect(insight?.reasons).toContain("Strongest skill: dynamic-programming");
    expect(insight?.reasons).toContain("Most difficult skill: graphs");
    expect(insight?.reasons).toContain("Fastest improving skill: dynamic-programming (+20 pts)");
    expect(insight?.reasons).toContain("Recently mastered: arrays");
  });

  it("returns null when the single available assessment has no strong/weak areas", () => {
    const input = baseInput({ assessments: [{ computedAt: new Date(2026, 6, 1) }] });
    expect(knowledgeGrowthRule(input)).toBeNull();
  });
});
