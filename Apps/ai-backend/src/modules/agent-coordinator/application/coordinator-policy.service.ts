import { Injectable } from '@nestjs/common';
import { IAgentContext } from '../../agent-core/domain/interfaces';
import { AgentExecutionOutcome } from '../domain/coordination-result';
import { CoordinationPlan } from '../domain/coordination-plan';
import { CoordinationErrorCode, CoordinationExecutionError, ExecutionPolicyName } from '../domain/coordination.types';
import { AgentExecutionInvoker, IExecutionStrategy } from '../interfaces/coordinator-strategy.interface';

/**
 * Executes plan.executionOrder one agent at a time, in group order. A failed
 * mandatory agent stops the run and marks every remaining agent 'skipped'; a
 * failed optional agent lets the coordinator continue.
 */
class SequentialStrategy implements IExecutionStrategy {
  readonly name: ExecutionPolicyName = 'Sequential';

  async run(
    plan: CoordinationPlan,
    context: IAgentContext,
    invoke: AgentExecutionInvoker,
  ): Promise<AgentExecutionOutcome[]> {
    const outcomes: AgentExecutionOutcome[] = [];
    let mandatoryFailed = false;

    for (const group of plan.executionOrder) {
      for (const agent of group.agents) {
        if (mandatoryFailed) {
          outcomes.push({ agentId: agent.agentId, role: agent.role, status: 'skipped' });
          continue;
        }

        const outcome = await invoke(agent, plan, context);
        outcomes.push(outcome);

        if (outcome.status === 'failed' && agent.role === 'mandatory') {
          mandatoryFailed = true;
        }
      }
    }

    return outcomes;
  }
}

/** Strategy contract exists per WP-AI-03G; execution is not implemented yet. */
class NotImplementedStrategy implements IExecutionStrategy {
  constructor(readonly name: ExecutionPolicyName) {}

  async run(): Promise<AgentExecutionOutcome[]> {
    throw new CoordinationExecutionError(
      CoordinationErrorCode.STRATEGY_NOT_IMPLEMENTED,
      `Execution policy "${this.name}" is not implemented yet`,
    );
  }
}

/**
 * Registry of execution-policy strategies (Sequential/Parallel/FirstSuccess/
 * MajorityVote/Pipeline). CoordinatorService resolves the policy named on the
 * plan and delegates the actual agent loop to it.
 */
@Injectable()
export class CoordinatorPolicyService {
  private readonly strategies = new Map<ExecutionPolicyName, IExecutionStrategy>([
    ['Sequential', new SequentialStrategy()],
    ['Parallel', new NotImplementedStrategy('Parallel')],
    ['FirstSuccess', new NotImplementedStrategy('FirstSuccess')],
    ['MajorityVote', new NotImplementedStrategy('MajorityVote')],
    ['Pipeline', new NotImplementedStrategy('Pipeline')],
  ]);

  get(name: ExecutionPolicyName): IExecutionStrategy {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      throw new CoordinationExecutionError(
        CoordinationErrorCode.STRATEGY_NOT_IMPLEMENTED,
        `Unknown execution policy "${name}"`,
      );
    }
    return strategy;
  }
}
