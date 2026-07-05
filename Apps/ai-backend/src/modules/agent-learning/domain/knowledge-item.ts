/**
 * Kinds of durable knowledge KnowledgeBuilderService distills from
 * ExecutionPatterns (WP-AI-03J ticket list, verbatim).
 */
export type KnowledgeItemType =
  | 'PreferredPlanner'
  | 'PreferredTool'
  | 'RecommendedAgentRole'
  | 'SuggestedWorkflow'
  | 'CommonFailure'
  | 'OptimizationHint';

/**
 * A distilled, advisory unit of knowledge. Purely descriptive — nothing in
 * this module or downstream reads a KnowledgeItem and mutates runtime state
 * because of it.
 */
export interface KnowledgeItem {
  readonly id: string;
  readonly type: KnowledgeItemType;
  readonly subject: string;
  readonly description: string;
  readonly confidence: number;
  readonly evidence: readonly string[];
  readonly createdAt: number;
}
