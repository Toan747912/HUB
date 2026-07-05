import { Injectable } from '@nestjs/common';
import { ConsensusStrategyName } from '../domain/collaboration.types';
import { ConsensusResult } from '../domain/consensus-result';
import { ReasoningStep } from '../domain/reasoning-step';

interface IConsensusStrategy {
  readonly name: ConsensusStrategyName;
  resolve(steps: ReasoningStep[]): ConsensusResult;
}

/**
 * Groups completed steps by their (serialized) output and picks the group
 * with a strict majority (> half of completed steps) as the decision. Ties
 * or no-majority situations are reported as 'unresolved' so the caller can
 * route the session through Critic -> Reviewer conflict resolution.
 */
class MajorityConsensusStrategy implements IConsensusStrategy {
  readonly name: ConsensusStrategyName = 'Majority';

  resolve(steps: ReasoningStep[]): ConsensusResult {
    const completed = steps.filter((step) => step.status === 'completed');
    if (completed.length === 0) {
      return { strategy: this.name, outcome: 'unresolved', reason: 'No completed reasoning steps to evaluate' };
    }

    const tally = new Map<string, { count: number; decision: Record<string, unknown> }>();
    for (const step of completed) {
      const key = JSON.stringify(step.output);
      const entry = tally.get(key) ?? { count: 0, decision: step.output };
      entry.count += 1;
      tally.set(key, entry);
    }

    let winner: { count: number; decision: Record<string, unknown> } | undefined;
    for (const entry of tally.values()) {
      if (!winner || entry.count > winner.count) {
        winner = entry;
      }
    }

    const agreementScore = winner ? winner.count / completed.length : 0;
    if (winner && winner.count * 2 > completed.length) {
      return { strategy: this.name, outcome: 'resolved', decision: winner.decision, agreementScore };
    }

    return {
      strategy: this.name,
      outcome: 'unresolved',
      agreementScore,
      reason: 'No strict majority agreement among reasoning step outputs',
    };
  }
}

/** Strategy contract exists per WP-AI-03I; resolution is not implemented yet. */
class NotImplementedConsensusStrategy implements IConsensusStrategy {
  constructor(readonly name: ConsensusStrategyName) {}

  resolve(): ConsensusResult {
    return {
      strategy: this.name,
      outcome: 'not_implemented',
      reason: `Consensus strategy "${this.name}" is not implemented yet`,
    };
  }
}

/**
 * Registry of consensus strategies (Majority/Weighted/Unanimous/Confidence).
 * Only Majority executes today; the others return a 'not_implemented'
 * ConsensusResult rather than throwing, mirroring the work package's explicit
 * "return NOT_IMPLEMENTED" requirement.
 */
@Injectable()
export class ConsensusService {
  private readonly strategies = new Map<ConsensusStrategyName, IConsensusStrategy>([
    ['Majority', new MajorityConsensusStrategy()],
    ['Weighted', new NotImplementedConsensusStrategy('Weighted')],
    ['Unanimous', new NotImplementedConsensusStrategy('Unanimous')],
    ['Confidence', new NotImplementedConsensusStrategy('Confidence')],
  ]);

  resolve(strategyName: ConsensusStrategyName, steps: ReasoningStep[]): ConsensusResult {
    const strategy = this.strategies.get(strategyName) ?? this.strategies.get('Majority')!;
    return strategy.resolve(steps);
  }
}
