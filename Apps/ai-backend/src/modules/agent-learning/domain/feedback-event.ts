/**
 * Design decision (WP-AI-03J): FeedbackEvent is the end-of-loop signal, not
 * an entry point. The entry point of the pipeline is
 * CompletedExecutionInput (domain/experience.ts) — that is what marks "an
 * execution finished, go learn from it". FeedbackEvent instead closes the
 * loop: it records that one learning cycle finished and captures which
 * Recommendations came out of it, so a future consumer can query "what
 * feedback/recommendations exist for workflow X" without re-deriving
 * anything. This matches the ticket's own phrasing for FeedbackService —
 * "records that a learning cycle completed / exposes recommendations for
 * future consumption" — and keeps the whole module additive-only: nothing
 * here ever mutates the Experience or re-opens a past LearningRecord.
 */
export interface FeedbackEvent {
  readonly feedbackId: string;
  readonly learningRecordId: string;
  readonly experienceId: string;
  readonly workflowId: string;
  readonly recommendationIds: readonly string[];
  readonly knowledgeItemCount: number;
  readonly patternCount: number;
  readonly recordedAt: number;
}
