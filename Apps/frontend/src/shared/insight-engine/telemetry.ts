import type { Insight } from "./types";

/**
 * Logs insight generation metadata only (category + rule ids + timing).
 * Never pass `reasons` or `title` here -- those may reflect learner notes/reflections.
 */
export function trackInsightGeneration(insights: Insight[], durationMs: number) {
  console.info("[telemetry] insight_generation", {
    durationMs: Math.round(durationMs),
    insightCount: insights.length,
    categories: insights.map((i) => i.category),
    rulesTriggered: insights.flatMap((i) => i.rulesTriggered),
  });
}
