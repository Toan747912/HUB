import { Assessment } from '../../domain/aggregates/assessment.aggregate';

export interface IAssessmentRepository {
  save(assessment: Assessment): Promise<void>;
  findById(id: string): Promise<Assessment | null>;
  findAll(learnerId?: string): Promise<Assessment[]>;
  delete(id: string): Promise<void>;
}

export const ASSESSMENT_REPOSITORY = Symbol('IAssessmentRepository');
