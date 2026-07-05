import { KnowledgeItem } from '../domain/knowledge-item';
import { Recommendation } from '../domain/recommendation';
import { KnowledgeItemQuery, RecommendationQuery } from './learning.interface';

/**
 * Read-only facade a future module can depend on to consume what
 * agent-learning has learned, without depending on LearningService's full
 * orchestration surface (extractor/detector/builder/engine internals) or on
 * any Mongo detail. Implemented by FeedbackService. Nothing in this module
 * calls back through this interface to change runtime behavior — it exists
 * purely so recommendations/knowledge can be *read* elsewhere later.
 */
export interface IKnowledgeProvider {
  getRecommendations(filter?: RecommendationQuery): Promise<Recommendation[]>;
  getKnowledgeItems(filter?: KnowledgeItemQuery): Promise<KnowledgeItem[]>;
}
