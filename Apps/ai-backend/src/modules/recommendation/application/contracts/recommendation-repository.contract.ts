import { ClientSession } from 'mongoose';
import { Recommendation } from '../../domain/aggregates/recommendation.aggregate';

export interface IRecommendationRepository {
  save(recommendation: Recommendation, session?: ClientSession): Promise<void>;
  findById(id: string): Promise<Recommendation | null>;
  findAll(learnerId?: string): Promise<Recommendation[]>;
  findByAssessmentId(assessmentId: string): Promise<Recommendation[]>;
  delete(id: string): Promise<void>;
}

export const RECOMMENDATION_REPOSITORY = Symbol('IRecommendationRepository');
