import { PrismaTransactionClient } from '../../../infrastructure/persistence/with-transaction';
import { ExecutionPattern } from '../domain/execution-pattern';
import { KnowledgeItem, KnowledgeItemType } from '../domain/knowledge-item';
import { LearningRecord } from '../domain/learning-record';
import { Recommendation, RecommendationCategory } from '../domain/recommendation';

export const LEARNING_REPOSITORY = 'LEARNING_REPOSITORY';

export interface RecommendationQuery {
  category?: RecommendationCategory;
  minConfidence?: number;
  limit?: number;
}

export interface KnowledgeItemQuery {
  type?: KnowledgeItemType;
  minConfidence?: number;
  limit?: number;
}

/**
 * Repository contract for everything agent-learning persists. Services never
 * touch Mongoose models directly — only through an ILearningRepository
 * implementation (MongoLearningRepository in production, an in-memory fake
 * in unit tests).
 */
export interface ILearningRepository {
  saveLearningRecord(record: LearningRecord, tx?: PrismaTransactionClient): Promise<LearningRecord>;
  listRecentLearningRecords(limit: number): Promise<LearningRecord[]>;
  findLearningRecordsByWorkflow(workflowId: string, limit: number): Promise<LearningRecord[]>;

  saveExecutionPatterns(patterns: ExecutionPattern[], tx?: PrismaTransactionClient): Promise<ExecutionPattern[]>;
  saveKnowledgeItems(items: KnowledgeItem[], tx?: PrismaTransactionClient): Promise<KnowledgeItem[]>;
  saveRecommendations(recommendations: Recommendation[], tx?: PrismaTransactionClient): Promise<Recommendation[]>;

  /**
   * Saves patterns/knowledge/recommendations and the owning LearningRecord as
   * a single atomic unit, so a crash mid-cycle never orphans data with no
   * LearningRecord pointing to it.
   */
  persistLearningCycle(
    patterns: ExecutionPattern[],
    knowledgeItems: KnowledgeItem[],
    recommendations: Recommendation[],
    record: LearningRecord,
  ): Promise<LearningRecord>;

  findKnowledgeItems(filter: KnowledgeItemQuery): Promise<KnowledgeItem[]>;
  findRecommendations(filter: RecommendationQuery): Promise<Recommendation[]>;
}
