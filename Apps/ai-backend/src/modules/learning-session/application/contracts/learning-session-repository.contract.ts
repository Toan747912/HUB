import { LearningSession } from '../../domain/aggregates/learning-session.aggregate';

export interface ILearningSessionRepository {
  save(session: LearningSession): Promise<void>;
  findById(id: string): Promise<LearningSession | null>;
  findAll(): Promise<LearningSession[]>;
  findByLearnerId(learnerId: string): Promise<LearningSession[]>;
  delete(id: string): Promise<void>;
}

export const LEARNING_SESSION_REPOSITORY = Symbol('ILearningSessionRepository');
