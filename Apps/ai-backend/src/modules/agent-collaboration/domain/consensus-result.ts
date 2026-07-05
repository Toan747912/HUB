import { ConsensusStrategyName } from './collaboration.types';

export type ConsensusOutcome = 'resolved' | 'unresolved' | 'not_implemented';

export interface ConsensusResult {
  strategy: ConsensusStrategyName;
  outcome: ConsensusOutcome;
  decision?: Record<string, unknown>;
  agreementScore?: number;
  reason?: string;
}
