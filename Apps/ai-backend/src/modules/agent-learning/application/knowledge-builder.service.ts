import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ExecutionPattern, PatternCategory } from '../domain/execution-pattern';
import { KnowledgeItem, KnowledgeItemType } from '../domain/knowledge-item';

/**
 * Step 3 of the learning pipeline: maps each detected ExecutionPattern
 * category onto a KnowledgeItemType. The mapping is deliberately 1:1 and
 * explainable — a KnowledgeItem always carries the patternId(s) it came from
 * as its evidence, so every distilled fact is traceable back to the raw
 * pattern that produced it.
 */
const CATEGORY_TO_KNOWLEDGE_TYPE: Record<PatternCategory, KnowledgeItemType> = {
  successful_workflow: 'SuggestedWorkflow',
  frequent_failure: 'CommonFailure',
  tool_usage_trend: 'PreferredTool',
  planner_confidence_trend: 'PreferredPlanner',
  consensus_quality: 'OptimizationHint',
  artifact_reuse: 'OptimizationHint',
  role_effectiveness: 'RecommendedAgentRole',
  message_bottleneck: 'OptimizationHint',
};

@Injectable()
export class KnowledgeBuilderService {
  build(patterns: ExecutionPattern[]): KnowledgeItem[] {
    return patterns.map((pattern) => this.toKnowledgeItem(pattern));
  }

  private toKnowledgeItem(pattern: ExecutionPattern): KnowledgeItem {
    return {
      id: randomUUID(),
      type: CATEGORY_TO_KNOWLEDGE_TYPE[pattern.category],
      subject: pattern.subject,
      description: pattern.description,
      confidence: pattern.confidence,
      evidence: [pattern.patternId],
      createdAt: Date.now(),
    };
  }
}
