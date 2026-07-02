import { Injectable } from '@nestjs/common';
import { Assessment } from '../../domain/aggregates/assessment.aggregate';
import {
  AssessmentListResponseDto,
  AssessmentResponseDto,
  CompetencyProfileResponseDto,
  KnowledgeGapsResponseDto
} from '../dto/responses/assessment.response.dto';

@Injectable()
export class AssessmentResponseMapper {
  toResponse(assessment: Assessment): AssessmentResponseDto {
    const result = assessment.getLatestResult();
    return {
      assessmentId: assessment.getId().toString(),
      goalId: assessment.getGoalId().toString(),
      roadmapId: assessment.getRoadmapId().toString(),
      learnerId: assessment.getLearnerId().toString(),
      status: assessment.getStatus(),
      version: assessment.getAggregateVersion(),
      result: result
        ? {
            skillScores: result.skillScores.map((s) => ({
              skillArea: s.skillArea,
              rawScore: s.rawScore,
              taskCount: s.taskCount,
              completedTaskCount: s.completedTaskCount
            })),
            competencies: result.competencies.map((c) => ({ skillArea: c.skillArea, score: c.score, level: c.level })),
            knowledgeGaps: result.knowledgeGaps.map((g) => ({ id: g.id, skillArea: g.skillArea, weight: g.weight, reason: g.reason })),
            confidenceScore: result.confidenceScore,
            readiness: result.readiness,
            weakAreas: [...result.weakAreas],
            strongAreas: [...result.strongAreas],
            engineVersion: result.engineVersion
          }
        : null
    };
  }

  toList(assessments: Assessment[]): AssessmentListResponseDto {
    const items = assessments.map((a) => this.toResponse(a));
    return { items, total: items.length };
  }

  toCompetencyProfile(assessment: Assessment): CompetencyProfileResponseDto {
    const result = assessment.getLatestResult();
    return {
      assessmentId: assessment.getId().toString(),
      competencies: result ? result.competencies.map((c) => ({ skillArea: c.skillArea, score: c.score, level: c.level })) : [],
      weakAreas: result ? [...result.weakAreas] : [],
      strongAreas: result ? [...result.strongAreas] : [],
      confidenceScore: result ? result.confidenceScore : 0,
      readiness: result ? result.readiness : 'NOT_READY'
    };
  }

  toKnowledgeGaps(assessment: Assessment): KnowledgeGapsResponseDto {
    const result = assessment.getLatestResult();
    return {
      assessmentId: assessment.getId().toString(),
      gaps: result ? result.knowledgeGaps.map((g) => ({ id: g.id, skillArea: g.skillArea, weight: g.weight, reason: g.reason })) : []
    };
  }
}
