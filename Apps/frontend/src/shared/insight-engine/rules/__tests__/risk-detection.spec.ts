import { riskDetectionRule } from "../risk-detection";
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

describe("riskDetectionRule", () => {
  it("returns null when no risk signals are present", () => {
    expect(riskDetectionRule(baseInput())).toBeNull();
  });

  it("flags falling engagement and declining focus at HIGH priority", () => {
    const input = baseInput({
      sessions: [
        {
          evidence: [
            { recordedAt: new Date(2026, 6, 1), engagementScore: 50, focusScore: 50 },
            { recordedAt: new Date(2026, 5, 23), engagementScore: 60, focusScore: 65 },
          ],
        },
      ],
    });

    const insight = riskDetectionRule(input);
    expect(insight?.priority).toBe("HIGH");
    expect(insight?.reasons.some((r) => r.includes("Falling engagement"))).toBe(true);
    expect(insight?.reasons.some((r) => r.includes("Declining focus"))).toBe(true);
  });

  it("flags long inactivity as URGENT", () => {
    const input = baseInput({
      sessions: [{ evidence: [{ recordedAt: new Date(2026, 5, 22) }] }],
    });

    const insight = riskDetectionRule(input);
    expect(insight?.priority).toBe("URGENT");
    expect(insight?.reasons.some((r) => r.includes("No study activity for 10 days"))).toBe(true);
  });

  it("flags repeated NOT_READY assessments as URGENT", () => {
    const input = baseInput({
      assessments: [
        { computedAt: new Date(2026, 6, 1), readiness: "NOT_READY" },
        { computedAt: new Date(2026, 5, 1), readiness: "NOT_READY" },
      ],
    });

    const insight = riskDetectionRule(input);
    expect(insight?.priority).toBe("URGENT");
    expect(insight?.reasons.some((r) => r.includes('stayed "NOT_READY"'))).toBe(true);
  });

  it("flags blocked roadmap milestones", () => {
    const input = baseInput({
      roadmaps: [
        {
          milestones: [
            {
              reached: false,
              tasks: [
                { id: "t1", completed: false },
                { id: "t2", completed: false, dependsOn: ["t1"] },
              ],
            },
          ],
        },
      ],
    });

    const insight = riskDetectionRule(input);
    expect(insight?.reasons.some((r) => r.includes("blocked by unmet dependencies"))).toBe(true);
  });
});
