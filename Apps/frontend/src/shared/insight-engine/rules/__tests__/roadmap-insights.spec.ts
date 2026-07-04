import { roadmapInsightsRule } from "../roadmap-insights";
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

describe("roadmapInsightsRule", () => {
  it("returns null when there are no roadmaps", () => {
    expect(roadmapInsightsRule(baseInput())).toBeNull();
  });

  it("reports completion, blocked milestones, and remaining estimated days", () => {
    const input = baseInput({
      roadmaps: [
        {
          progress: { completionRatio: 0.5 },
          milestones: [
            {
              reached: true,
              tasks: [{ id: "t1", completed: true, estimatedDurationDays: 2 }],
            },
            {
              reached: false,
              tasks: [
                { id: "t2", completed: false, estimatedDurationDays: 3, dependsOn: ["t3"] },
                { id: "t3", completed: false, estimatedDurationDays: 1 },
              ],
            },
          ],
        },
      ],
    });

    const insight = roadmapInsightsRule(input);
    expect(insight?.title).toBe("Your roadmap is 50% complete.");
    expect(insight?.reasons).toContain("1 of 2 milestones completed");
    expect(insight?.reasons).toContain("Estimated 4 day(s) of work remaining");
    expect(insight?.reasons.some((r) => r.includes("blocked"))).toBe(true);
    expect(insight?.priority).toBe("HIGH");
  });
});
