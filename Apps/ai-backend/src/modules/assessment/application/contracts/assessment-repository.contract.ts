import { PrismaTransactionClient } from '../../../../infrastructure/persistence/with-transaction';
import { Assessment } from '../../domain/aggregates/assessment.aggregate';

export interface IAssessmentRepository {
  save(assessment: Assessment, tx?: PrismaTransactionClient): Promise<void>;
  findById(id: string): Promise<Assessment | null>;
  findAll(learnerId?: string): Promise<Assessment[]>;
  findByRoadmapId(roadmapId: string): Promise<Assessment[]>;
  delete(id: string): Promise<void>;
}

export const ASSESSMENT_REPOSITORY = Symbol('IAssessmentRepository');
