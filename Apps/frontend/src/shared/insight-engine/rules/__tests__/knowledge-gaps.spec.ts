import { knowledgeGapsRule } from "../knowledge-gaps";
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

describe("knowledgeGapsRule", () => {
  it("returns null when the latest assessment has no knowledge gaps", () => {
    expect(knowledgeGapsRule(baseInput({ assessments: [{ computedAt: NOW }] }))).toBeNull();
  });

  it("picks the highest-weighted gap and counts remaining dependent roadmap tasks", () => {
    const input = baseInput({
      assessments: [
        {
          computedAt: NOW,
          knowledgeGaps: [
            { skillId: "recursion", weight: "LOW", reason: "Minor gap" },
            {
              skillId: "dynamic-programming",
              weight: "CRITICAL",
              reason: "Core concept not yet applied",
            },
          ],
        },
      ],
      roadmaps: [
        {
          milestones: [
            {
              tasks: [
                { skillId: "dynamic-programming", completed: false },
                { skillId: "dynamic-programming", completed: false },
                { skillId: "dynamic-programming", completed: true },
              ],
            },
          ],
        },
      ],
    });

    const insight = knowledgeGapsRule(input);
    expect(insight?.title).toBe("dynamic-programming remains your largest knowledge gap.");
    expect(insight?.priority).toBe("HIGH");
    expect(insight?.reasons).toContain("Core concept not yet applied");
    expect(insight?.reasons.some((r) => r.includes("2 more roadmap tasks"))).toBe(true);
  });
});
