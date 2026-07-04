import { recommendationExplanationRule } from "../recommendation-explanation";
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

describe("recommendationExplanationRule", () => {
  it("returns null when there is no actionable recommendation", () => {
    expect(recommendationExplanationRule(baseInput())).toBeNull();
  });

  it("explains why, evidence, expected benefit, dependencies, and confidence", () => {
    const input = baseInput({
      recommendationPlans: [
        {
          status: "GENERATED",
          items: [
            {
              scores: { priorityScore: 90, overallScore: 82, confidenceScore: 75 },
              reason: { summary: "Focus on dynamic programming", evidence: ["needScore=80"] },
              affectedGoalId: "goal-1",
              affectedRoadmapId: "roadmap-1",
            },
          ],
        },
      ],
    });

    const insight = recommendationExplanationRule(input);
    expect(insight?.reasons).toContain("Why: Focus on dynamic programming");
    expect(insight?.reasons).toContain("Evidence: needScore=80");
    expect(insight?.reasons).toContain("Expected benefit: overall impact score 82/100");
    expect(insight?.reasons).toContain("Dependencies: linked to 2 tracked item(s)");
    expect(insight?.reasons).toContain("Confidence: 75%");
    expect(insight?.priority).toBe("MEDIUM");
  });

  it("uses LOW priority when confidence is below the threshold", () => {
    const input = baseInput({
      recommendationPlans: [
        { status: "GENERATED", items: [{ scores: { priorityScore: 10, confidenceScore: 40 } }] },
      ],
    });
    expect(recommendationExplanationRule(input)?.priority).toBe("LOW");
  });
});
