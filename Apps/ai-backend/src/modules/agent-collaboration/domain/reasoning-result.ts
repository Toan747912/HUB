import { SemanticRole } from './agent-role';
import { ConsensusResult } from './consensus-result';

export type ArtifactType =
  | 'research_notes'
  | 'draft_plan'
  | 'code'
  | 'evidence'
  | 'critique'
  | 'verification'
  | 'summary';

/**
 * A unit of data exchanged between reasoning steps. Every artifact is
 * persisted to Memory (SESSION scope, keyed by artifactId) by
 * ReasoningService as soon as it is produced.
 */
export interface ReasoningArtifact {
  artifactId: string;
  type: ArtifactType;
  producedBy: SemanticRole;
  agentId: string;
  content: Record<string, unknown>;
  createdAt: number;
}

export type ReasoningResultStatus = 'success' | 'partial' | 'failure';

/**
 * The synthesized final response of a collaboration session (SynthesisService
 * output). Mirrors CoordinationResult's never-reject convention:
 * CollaborationService.collaborate() always resolves one of these, tagging
 * status 'failure' instead of rejecting when the session could not complete.
 */
export interface ReasoningResult {
  sessionId: string;
  summary: string;
  artifacts: ReasoningArtifact[];
  confidence: number;
  contributors: string[];
  consensus: ConsensusResult;
  status: ReasoningResultStatus;
}
