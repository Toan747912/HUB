import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { KnowledgeItem, KnowledgeItemType } from '../domain/knowledge-item';
import { Recommendation, RecommendationCategory } from '../domain/recommendation';

/**
 * Step 4 of the learning pipeline: turns KnowledgeItems into read-only,
 * advisory Recommendations. This service has no side effects on runtime
 * behavior — it only produces data for a future consumer to read (via
 * FeedbackService / IKnowledgeProvider).
 */
const KNOWLEDGE_TYPE_TO_CATEGORY: Record<KnowledgeItemType, RecommendationCategory> = {
  PreferredPlanner: 'planner',
  PreferredTool: 'tool',
  RecommendedAgentRole: 'role',
  SuggestedWorkflow: 'workflow',
  CommonFailure: 'execution',
  OptimizationHint: 'execution',
};

const ACTION_PREFIX: Record<KnowledgeItemType, string> = {
  PreferredPlanner: 'Prefer planner capability',
  PreferredTool: 'Prefer tool/artifact type',
  RecommendedAgentRole: 'Favor assigning role',
  SuggestedWorkflow: 'Reuse workflow shape',
  CommonFailure: 'Investigate recurring failure in',
  OptimizationHint: 'Consider optimizing',
};

@Injectable()
export class RecommendationEngineService {
  generate(items: KnowledgeItem[]): Recommendation[] {
    return items.map((item) => this.toRecommendation(item));
  }

  private toRecommendation(item: KnowledgeItem): Recommendation {
    return {
      id: randomUUID(),
      category: KNOWLEDGE_TYPE_TO_CATEGORY[item.type],
      subject: item.subject,
      description: `${ACTION_PREFIX[item.type]} "${item.subject}". ${item.description}`,
      confidence: item.confidence,
      basedOnKnowledgeItemIds: [item.id],
      createdAt: Date.now(),
    };
  }
}
