import { generateInsights } from "../engine";
import type { InsightEngineInput } from "../types";

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

describe("generateInsights", () => {
  it("returns an empty list when no rules trigger", () => {
    expect(generateInsights(baseInput())).toEqual([]);
  });

  it("always surfaces Today's Mission first, followed by URGENT risk signals", () => {
    const input = baseInput({
      recommendationPlans: [
        { status: "GENERATED", items: [{ skillId: "dp", scores: { priorityScore: 90 } }] },
      ],
      sessions: [{ evidence: [{ recordedAt: new Date(2026, 5, 22) }] }], // long inactivity -> URGENT
      goals: [{ progress: { completionRatio: 0.5 } }], // MEDIUM, non-urgent
    });

    const insights = generateInsights(input);
    expect(insights[0].category).toBe("TODAYS_MISSION");
    expect(insights[1].category).toBe("RISK_DETECTION");
    expect(insights[1].priority).toBe("URGENT");
  });

  it("caps the total number of insights to avoid overwhelming the learner", () => {
    const input = baseInput({
      goals: [{ progress: { completionRatio: 0.4 } }],
      roadmaps: [
        {
          progress: { completionRatio: 0.6 },
          milestones: [
            { reached: true, tasks: [{ id: "t1", completed: true, estimatedDurationDays: 1 }] },
          ],
        },
      ],
      recommendationPlans: [
        { status: "GENERATED", items: [{ skillId: "dp", scores: { priorityScore: 90 } }] },
      ],
      assessments: [
        {
          computedAt: NOW,
          strongAreas: ["dp"],
          weakAreas: ["graphs"],
          knowledgeGaps: [{ skillId: "graphs", weight: "HIGH", reason: "Needs practice" }],
        },
      ],
      sessions: [
        {
          status: "COMPLETED",
          progress: { lastUpdatedAt: NOW },
          evidence: [
            {
              recordedAt: new Date(2026, 6, 1),
              focusScore: 80,
              engagementScore: 80,
              timeSpent: 600,
            },
            { recordedAt: new Date(2026, 5, 20), focusScore: 40, engagementScore: 40 },
          ],
          reflection: { recordedAt: NOW, rating: 4 },
          tasks: [{ completed: true, completedAt: NOW }],
        },
      ],
    });

    const insights = generateInsights(input);
    expect(insights.length).toBeLessThanOrEqual(8);
  });
});
