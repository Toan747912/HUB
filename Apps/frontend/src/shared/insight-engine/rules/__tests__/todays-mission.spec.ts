import { todaysMissionRule } from "../todays-mission";
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

describe("todaysMissionRule", () => {
  it("returns null when there are no GENERATED recommendation plans", () => {
    expect(todaysMissionRule(baseInput())).toBeNull();
  });

  it("picks the highest-priority item and explains why it decreased confidence and was last reviewed", () => {
    const input = baseInput({
      recommendationPlans: [
        {
          status: "GENERATED",
          items: [
            {
              skillId: "dynamic-programming",
              scores: { priorityScore: 90 },
              reason: { summary: "Review DP" },
            },
            {
              skillId: "graphs",
              scores: { priorityScore: 40 },
              reason: { summary: "Review graphs" },
            },
          ],
        },
      ],
      assessments: [{ computedAt: new Date(2026, 6, 1), weakAreas: ["dynamic-programming"] }],
      sessions: [
        {
          skillId: "dynamic-programming",
          evidence: [{ recordedAt: new Date(2026, 5, 27), timeSpent: 1800 }],
        },
      ],
    });

    const insight = todaysMissionRule(input);
    expect(insight).not.toBeNull();
    expect(insight?.title).toContain("dynamic-programming");
    expect(insight?.reasons).toContain("Confidence decreased after the latest assessment");
    expect(insight?.reasons).toContain("Last reviewed 5 days ago");
  });

  it("flags upcoming roadmap dependencies on the recommended topic", () => {
    const input = baseInput({
      recommendationPlans: [
        {
          status: "GENERATED",
          items: [{ skillId: "recursion", scores: { priorityScore: 80 } }],
        },
      ],
      roadmaps: [
        {
          milestones: [
            {
              tasks: [
                { id: "t1", skillId: "recursion", completed: true },
                { id: "t2", skillId: "backtracking", completed: false, dependsOn: ["t1"] },
              ],
            },
          ],
        },
      ],
    });

    const insight = todaysMissionRule(input);
    expect(insight?.reasons).toContain("Upcoming roadmap tasks depend on this topic");
  });

  it("derives suggested minutes from recent evidence time spent", () => {
    const input = baseInput({
      recommendationPlans: [
        { status: "GENERATED", items: [{ skillId: "arrays", scores: { priorityScore: 10 } }] },
      ],
      sessions: [{ evidence: [{ timeSpent: 2520 }] }], // 42 minutes
    });

    const insight = todaysMissionRule(input);
    expect(insight?.title).toContain("42 minutes");
  });

  it("ignores plans that are not GENERATED", () => {
    const input = baseInput({
      recommendationPlans: [
        { status: "APPROVED", items: [{ skillId: "arrays", scores: { priorityScore: 99 } }] },
      ],
    });
    expect(todaysMissionRule(input)).toBeNull();
  });
});
