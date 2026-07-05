/**
 * Where a completed execution came from. agent-learning never imports the
 * upstream modules directly (it stays a pure consumer) — callers normalize
 * their own module's output into a `CompletedExecutionInput` and hand it to
 * ExperienceExtractorService. The shapes below are intentionally duck-typed
 * supersets of CoordinationResult / CollaborationSession / AgentMessage so no
 * compile-time dependency on those modules is required.
 */
export type ExecutionSourceType = 'coordination' | 'collaboration' | 'message_bus' | 'runtime' | 'manual';

export type ExecutionOutcomeStatus = 'success' | 'failure' | 'partial';

export interface CompletedExecutionArtifactInput {
  artifactId?: string;
  type?: string;
  producedBy?: string;
  agentId?: string;
}

export interface CompletedExecutionConsensusInput {
  strategy?: string;
  outcome?: string;
  agreementScore?: number;
}

/**
 * The normalized-enough-to-normalize-further input ExperienceExtractorService
 * accepts. Every field beyond `workflowId`/`goal`/`status`/`sourceType` is
 * optional because different sources (coordination vs. collaboration vs.
 * message bus) surface different subsets of this information.
 */
export interface CompletedExecutionInput {
  workflowId: string;
  goal: string;
  sourceType: ExecutionSourceType;
  status: ExecutionOutcomeStatus;
  participants?: string[];
  roles?: Record<string, string>;
  artifacts?: CompletedExecutionArtifactInput[];
  messages?: string[];
  startedAt?: number;
  endedAt?: number;
  durationMs?: number;
  confidence?: number;
  errors?: string[];
  consensus?: CompletedExecutionConsensusInput;
  plannerCapability?: string;
}

export interface ExperienceArtifact {
  artifactId: string;
  type: string;
  producedBy: string;
}

/**
 * Immutable value object: the normalized record of one completed execution,
 * ready for pattern detection. Never mutated once created — a re-run of the
 * same workflow produces a new Experience, not an update to an old one.
 */
export interface Experience {
  readonly experienceId: string;
  readonly workflowId: string;
  readonly goal: string;
  readonly sourceType: ExecutionSourceType;
  readonly participants: readonly string[];
  readonly roles: Readonly<Record<string, string>>;
  readonly artifacts: readonly ExperienceArtifact[];
  readonly messages: readonly string[];
  readonly durationMs: number;
  readonly success: boolean;
  readonly confidence: number;
  readonly errors: readonly string[];
  readonly consensus?: Readonly<CompletedExecutionConsensusInput>;
  readonly plannerCapability?: string;
  readonly capturedAt: number;
}
