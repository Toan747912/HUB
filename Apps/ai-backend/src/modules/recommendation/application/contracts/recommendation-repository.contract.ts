import { Recommendation } from '../../domain/aggregates/recommendation.aggregate';

export interface IRecommendationRepository {
  save(recommendation: Recommendation): Promise<void>;
  findById(id: string): Promise<Recommendation | null>;
  findAll(learnerId?: string): Promise<Recommendation[]>;
  delete(id: string): Promise<void>;
}

export const RECOMMENDATION_REPOSITORY = Symbol('IRecommendationRepository');
