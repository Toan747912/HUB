import { Experience } from './experience';
import { FeedbackEvent } from './feedback-event';

/**
 * The persisted top-level unit of one learning cycle, tying the Experience
 * it was derived from to everything mined out of it. Additive-only: every
 * learning cycle appends a brand-new LearningRecord; past records are never
 * mutated, so the collection doubles as an audit trail.
 */
export interface LearningRecord {
  readonly recordId: string;
  readonly experience: Experience;
  readonly patternIds: readonly string[];
  readonly knowledgeItemIds: readonly string[];
  readonly recommendationIds: readonly string[];
  readonly feedback: FeedbackEvent;
  readonly createdAt: number;
}
