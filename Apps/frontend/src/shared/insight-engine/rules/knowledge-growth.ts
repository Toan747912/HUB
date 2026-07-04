import type { Insight, InsightEngineInput } from "../types";
import { toDate } from "./shared";

const RULE_ID = "knowledge-growth/skill-trajectory";
const MASTERY_SCORE_THRESHOLD = 90;

function sortedByComputedAtDesc(input: InsightEngineInput) {
  return [...input.assessments].sort(
    (a, b) => (toDate(b.computedAt)?.getTime() ?? 0) - (toDate(a.computedAt)?.getTime() ?? 0),
  );
}

export function knowledgeGrowthRule(input: InsightEngineInput): Insight | null {
  const assessments = sortedByComputedAtDesc(input);
  const latest = assessments[0];
  if (!latest) return null;

  const reasons: string[] = [];

  const strongest = latest.strongAreas?.[0];
  if (strongest) reasons.push(`Strongest skill: ${strongest}`);

  const mostDifficult = latest.weakAreas?.[0];
  if (mostDifficult) reasons.push(`Most difficult skill: ${mostDifficult}`);

  const previous = assessments[1];
  if (previous) {
    let fastestImproving: { skillId: string; delta: number } | null = null;
    for (const score of latest.skillScores ?? []) {
      const prevScore = previous.skillScores?.find((s) => s.skillId === score.skillId);
      if (!prevScore || !score.skillId) continue;
      const delta = (score.rawScore ?? 0) - (prevScore.rawScore ?? 0);
      if (!fastestImproving || delta > fastestImproving.delta) {
        fastestImproving = { skillId: score.skillId, delta };
      }
    }
    if (fastestImproving && fastestImproving.delta > 0) {
      reasons.push(
        `Fastest improving skill: ${fastestImproving.skillId} (+${Math.round(fastestImproving.delta)} pts)`,
      );
    }

    const recentlyMastered = (latest.competencies ?? [])
      .filter((c) => (c.score ?? 0) >= MASTERY_SCORE_THRESHOLD)
      .filter((c) => {
        const prevCompetency = previous.competencies?.find((p) => p.skillId === c.skillId);
        return !prevCompetency || (prevCompetency.score ?? 0) < MASTERY_SCORE_THRESHOLD;
      })
      .map((c) => c.skillId)
      .filter((id): id is string => Boolean(id));
    if (recentlyMastered.length > 0) {
      reasons.push(`Recently mastered: ${recentlyMastered.join(", ")}`);
    }
  }

  if (reasons.length === 0) return null;

  return {
    id: "knowledge-growth",
    category: "KNOWLEDGE_GROWTH",
    priority: "LOW",
    title: strongest
      ? `${strongest} is your strongest skill right now.`
      : "Your skill profile is developing across several areas.",
    reasons,
    rulesTriggered: [RULE_ID],
  };
}
