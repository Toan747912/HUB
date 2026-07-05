import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Experience } from '../domain/experience';
import { FeedbackEvent } from '../domain/feedback-event';
import { KnowledgeItem } from '../domain/knowledge-item';
import { ExecutionPattern } from '../domain/execution-pattern';
import { Recommendation } from '../domain/recommendation';
import { IKnowledgeProvider } from '../interfaces/knowledge-provider.interface';
import {
  ILearningRepository,
  KnowledgeItemQuery,
  LEARNING_REPOSITORY,
  RecommendationQuery,
} from '../interfaces/learning.interface';

/**
 * Step 5 of the learning pipeline: closes the loop. Builds the FeedbackEvent
 * that records "this learning cycle finished" (see domain/feedback-event.ts
 * for the entry-point-vs-end-of-loop design decision) and exposes the
 * IKnowledgeProvider read surface so a future module can query recommended
 * knowledge without depending on the rest of this module. Purely additive:
 * this service never mutates a past LearningRecord/Recommendation, and never
 * triggers any runtime change on its own.
 */
@Injectable()
export class FeedbackService implements IKnowledgeProvider {
  constructor(@Inject(LEARNING_REPOSITORY) private readonly repository: ILearningRepository) {}

  buildFeedbackEvent(
    learningRecordId: string,
    experience: Experience,
    patterns: ExecutionPattern[],
    knowledgeItems: KnowledgeItem[],
    recommendations: Recommendation[],
  ): FeedbackEvent {
    return {
      feedbackId: randomUUID(),
      learningRecordId,
      experienceId: experience.experienceId,
      workflowId: experience.workflowId,
      recommendationIds: recommendations.map((r) => r.id),
      knowledgeItemCount: knowledgeItems.length,
      patternCount: patterns.length,
      recordedAt: Date.now(),
    };
  }

  async getRecommendations(filter: RecommendationQuery = {}): Promise<Recommendation[]> {
    return this.repository.findRecommendations(filter);
  }

  async getKnowledgeItems(filter: KnowledgeItemQuery = {}): Promise<KnowledgeItem[]> {
    return this.repository.findKnowledgeItems(filter);
  }
}
