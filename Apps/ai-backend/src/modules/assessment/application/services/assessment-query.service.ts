import { Assessment } from '../../domain/aggregates/assessment.aggregate';
import { IAssessmentRepository } from '../contracts/assessment-repository.contract';
import { AssessmentNotFoundError } from '../errors/application.errors';
import { GetAssessmentQuery } from '../queries/get-assessment.query';
import { GetAssessmentsQuery } from '../queries/get-assessments.query';
import { GetCompetencyProfileQuery } from '../queries/get-competency-profile.query';
import { GetKnowledgeGapsQuery } from '../queries/get-knowledge-gaps.query';

export class AssessmentQueryService {
  constructor(private readonly repository: IAssessmentRepository) {}

  async getAssessment(query: GetAssessmentQuery): Promise<Assessment> {
    const start = Date.now();
    try {
      const assessment = await this.repository.findById(query.assessmentId);
      if (!assessment) throw new AssessmentNotFoundError(query.assessmentId);
      this.log('GET_ASSESSMENT', query.assessmentId, start, 'SUCCESS');
      return assessment;
    } catch (error) {
      this.log('GET_ASSESSMENT', query.assessmentId, start, 'FAILURE', error);
      throw error;
    }
  }

  async getAssessments(query: GetAssessmentsQuery): Promise<Assessment[]> {
    const start = Date.now();
    try {
      const assessments = await this.repository.findAll(query.learnerId);
      this.log('GET_ASSESSMENTS', query.learnerId ?? 'all', start, 'SUCCESS');
      return assessments;
    } catch (error) {
      this.log('GET_ASSESSMENTS', query.learnerId ?? 'all', start, 'FAILURE', error);
      throw error;
    }
  }

  async getCompetencyProfile(query: GetCompetencyProfileQuery): Promise<Assessment> {
    const start = Date.now();
    try {
      const assessment = await this.repository.findById(query.assessmentId);
      if (!assessment) throw new AssessmentNotFoundError(query.assessmentId);
      this.log('GET_COMPETENCY_PROFILE', query.assessmentId, start, 'SUCCESS');
      return assessment;
    } catch (error) {
      this.log('GET_COMPETENCY_PROFILE', query.assessmentId, start, 'FAILURE', error);
      throw error;
    }
  }

  async getKnowledgeGaps(query: GetKnowledgeGapsQuery): Promise<Assessment> {
    const start = Date.now();
    try {
      const assessment = await this.repository.findById(query.assessmentId);
      if (!assessment) throw new AssessmentNotFoundError(query.assessmentId);
      this.log('GET_KNOWLEDGE_GAPS', query.assessmentId, start, 'SUCCESS');
      return assessment;
    } catch (error) {
      this.log('GET_KNOWLEDGE_GAPS', query.assessmentId, start, 'FAILURE', error);
      throw error;
    }
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
