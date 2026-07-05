import { Injectable } from '@nestjs/common';
import { ConsensusResult } from '../domain/consensus-result';
import { ReasoningArtifact, ReasoningResult } from '../domain/reasoning-result';
import { ReasoningStep } from '../domain/reasoning-step';

/**
 * Builds the final collaboration response: a human-readable reasoning
 * summary, the artifacts exchanged along the way, an average confidence
 * across completed steps, the distinct contributing agents, and the
 * consensus result that produced (or failed to produce) the decision.
 */
@Injectable()
export class SynthesisService {
  synthesize(
    sessionId: string,
    steps: ReasoningStep[],
    artifacts: ReasoningArtifact[],
    consensus: ConsensusResult,
  ): ReasoningResult {
    const contributors = Array.from(new Set(steps.map((step) => step.agentId)));
    const completed = steps.filter((step) => step.status === 'completed');
    const confidence =
      completed.length > 0 ? completed.reduce((sum, step) => sum + step.confidence, 0) / completed.length : 0;

    return {
      sessionId,
      summary: this.buildSummary(steps, consensus),
      artifacts,
      confidence,
      contributors,
      consensus,
      status: steps.length > 0 && steps.every((step) => step.status === 'completed') ? 'success' : 'partial',
    };
  }

  private buildSummary(steps: ReasoningStep[], consensus: ConsensusResult): string {
    const roleSummaries = steps.map((step) => `${step.role} (${step.agentId}): ${step.status}`).join('; ');
    return `Reasoning across ${steps.length} step(s) [${roleSummaries}]. Consensus via ${consensus.strategy}: ${consensus.outcome}.`;
  }
}
