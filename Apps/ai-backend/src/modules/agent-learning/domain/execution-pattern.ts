/**
 * The categories of pattern PatternDetectorService knows how to mine from a
 * set of Experiences (WP-AI-03J ticket list, verbatim).
 */
export type PatternCategory =
  | 'successful_workflow'
  | 'frequent_failure'
  | 'tool_usage_trend'
  | 'planner_confidence_trend'
  | 'consensus_quality'
  | 'artifact_reuse'
  | 'role_effectiveness'
  | 'message_bottleneck';

/**
 * Supporting evidence for a detected pattern: the experiences it was mined
 * from plus whatever scalar metrics justify the pattern's confidence score.
 */
export interface PatternEvidence {
  experienceIds: readonly string[];
  occurrences: number;
  metrics?: Readonly<Record<string, number>>;
}

/**
 * A detected shape across multiple Experiences. Additive and re-derivable:
 * PatternDetectorService recomputes the full set on every learning cycle
 * rather than patching an existing pattern in place.
 */
export interface ExecutionPattern {
  readonly patternId: string;
  readonly category: PatternCategory;
  readonly subject: string;
  readonly description: string;
  readonly confidence: number;
  readonly evidence: PatternEvidence;
  readonly detectedAt: number;
}
