import { LearningStrategyValue } from '../../../../shared/domain/vocabulary/learning-strategy.vo';

export type LearningStrategyCatalogEntry = {
  strategy: LearningStrategyValue;
  description: string;
};

/** Static, deterministic catalog backing GET /recommendation/strategies. */
export const LEARNING_STRATEGY_CATALOG: LearningStrategyCatalogEntry[] = [
  { strategy: 'REVIEW', description: 'Revisit foundational material before continuing; competency is below the review threshold.' },
  { strategy: 'PRACTICE', description: 'Reinforce with additional practice; competency is developing but not yet solid.' },
  { strategy: 'ADVANCE', description: 'Proceed to the next material; competency is solid and no significant gap remains.' },
  { strategy: 'SLOW_DOWN', description: 'Reduce pace to consolidate; high roadmap revision churn suggests overload.' },
  { strategy: 'SKIP', description: 'Skip ahead; competency is already mastered (EXPERT-level) with no knowledge gap.' },
  { strategy: 'REPEAT', description: 'Redo previously completed work; it was completed but took significantly longer than estimated.' },
  { strategy: 'DEEP_DIVE', description: 'Dedicate focused study time; a HIGH or CRITICAL knowledge gap was detected.' },
  { strategy: 'RECOVERY', description: 'Enter a remediation track; a CRITICAL knowledge gap coincides with very low competency.' }
];
