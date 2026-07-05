import { SemanticRole } from './agent-role';
import { ConsensusResult } from './consensus-result';
import { ReasoningArtifact, ReasoningResult } from './reasoning-result';
import { ReasoningStep } from './reasoning-step';

export type CollaborationSessionStatus = 'running' | 'completed' | 'failed';

/**
 * The full record of one collaborative reasoning run. Persisted to Memory
 * (SESSION scope, key 'session') by CollaborationService so a session can be
 * inspected after the fact without re-running it.
 */
export interface CollaborationSession {
  sessionId: string;
  goal: string;
  participants: string[];
  roles: Record<SemanticRole, string>;
  steps: ReasoningStep[];
  artifacts: ReasoningArtifact[];
  messages: string[];
  consensus?: ConsensusResult;
  finalResult?: ReasoningResult;
  status: CollaborationSessionStatus;
  startedAt: number;
  endedAt?: number;
}
