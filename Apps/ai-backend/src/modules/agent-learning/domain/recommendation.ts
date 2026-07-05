/**
 * Advisory recommendation categories RecommendationEngineService can emit.
 * "Read-only advisory" is a hard constraint: nothing in agent-learning (or
 * wired by app.module.ts on its behalf) consumes a Recommendation and acts on
 * it automatically. A future module may choose to read and apply one.
 */
export type RecommendationCategory = 'execution' | 'tool' | 'role' | 'workflow' | 'planner';

export interface Recommendation {
  readonly id: string;
  readonly category: RecommendationCategory;
  readonly subject: string;
  readonly description: string;
  readonly confidence: number;
  readonly basedOnKnowledgeItemIds: readonly string[];
  readonly createdAt: number;
}
