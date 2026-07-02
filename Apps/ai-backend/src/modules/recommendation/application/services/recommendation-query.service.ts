import { Recommendation } from '../../domain/aggregates/recommendation.aggregate';
import { LEARNING_STRATEGY_CATALOG, LearningStrategyCatalogEntry } from '../../domain/engine/learning-strategy-catalog';
import { IRecommendationRepository } from '../contracts/recommendation-repository.contract';
import { RecommendationNotFoundError } from '../errors/application.errors';
import { GetRecommendationQuery } from '../queries/get-recommendation.query';
import { GetRecommendationsQuery } from '../queries/get-recommendations.query';
import { GetRecommendationHistoryQuery } from '../queries/get-recommendation-history.query';
import { GetLearningStrategiesQuery } from '../queries/get-learning-strategies.query';

export class RecommendationQueryService {
  constructor(private readonly repository: IRecommendationRepository) {}

  async getRecommendation(query: GetRecommendationQuery): Promise<Recommendation> {
    const start = Date.now();
    try {
      const recommendation = await this.repository.findById(query.recommendationId);
      if (!recommendation) throw new RecommendationNotFoundError(query.recommendationId);
      this.log('GET_RECOMMENDATION', query.recommendationId, start, 'SUCCESS');
      return recommendation;
    } catch (error) {
      this.log('GET_RECOMMENDATION', query.recommendationId, start, 'FAILURE', error);
      throw error;
    }
  }

  async getRecommendations(query: GetRecommendationsQuery): Promise<Recommendation[]> {
    const start = Date.now();
    try {
      const recommendations = await this.repository.findAll(query.learnerId);
      this.log('GET_RECOMMENDATIONS', query.learnerId ?? 'all', start, 'SUCCESS');
      return recommendations;
    } catch (error) {
      this.log('GET_RECOMMENDATIONS', query.learnerId ?? 'all', start, 'FAILURE', error);
      throw error;
    }
  }

  async getRecommendationHistory(query: GetRecommendationHistoryQuery): Promise<Recommendation> {
    const start = Date.now();
    try {
      const recommendation = await this.repository.findById(query.recommendationId);
      if (!recommendation) throw new RecommendationNotFoundError(query.recommendationId);
      this.log('GET_RECOMMENDATION_HISTORY', query.recommendationId, start, 'SUCCESS');
      return recommendation;
    } catch (error) {
      this.log('GET_RECOMMENDATION_HISTORY', query.recommendationId, start, 'FAILURE', error);
      throw error;
    }
  }

  // Backs GET /recommendation/strategies: the static, supported learning-strategy
  // catalog (not tied to a specific Recommendation aggregate).
  getLearningStrategies(_query: GetLearningStrategiesQuery): LearningStrategyCatalogEntry[] {
    return LEARNING_STRATEGY_CATALOG;
  }

  private log(operation: string, aggregateId: string, startMs: number, status: string, error?: unknown): void {
    console.log(
      JSON.stringify({
        traceId: 'app',
        aggregateId,
        operation,
        latencyMs: Date.now() - startMs,
        status,
        errorType: error instanceof Error ? error.constructor.name : undefined,
        timestamp: new Date().toISOString()
      })
    );
  }
}
