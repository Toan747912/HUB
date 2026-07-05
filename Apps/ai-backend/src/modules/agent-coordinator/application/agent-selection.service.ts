import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IAgentContext, IAgentRequest } from '../../agent-core/domain/interfaces';
import { AgentRegistryService } from '../../agent-runtime/application/agent-registry.service';
import { PlannedAgent } from '../domain/coordination-plan';
import { CoordinationErrorCode, CoordinationExecutionError } from '../domain/coordination.types';

/**
 * Resolves the agents named in a coordination plan against the Agent
 * Registry (the same registry AgentRuntimeService reads from) and builds the
 * IAgentRequest each one will be delegated with. Does not execute agents -
 * that is CoordinatorService's job via AgentRuntimeService.
 */
@Injectable()
export class AgentSelectionService {
  constructor(private readonly agentRegistry: AgentRegistryService) {}

  resolve(agent: PlannedAgent): void {
    const definition = this.agentRegistry.get(agent.agentId);
    if (!definition) {
      throw new CoordinationExecutionError(
        CoordinationErrorCode.AGENT_NOT_FOUND,
        `Agent "${agent.agentId}" is not registered`,
        agent.agentId,
      );
    }
  }

  buildRequest(agent: PlannedAgent, sharedContext: IAgentContext): IAgentRequest {
    this.resolve(agent);

    return {
      requestId: randomUUID(),
      agentId: agent.agentId,
      goal: agent.goal,
      input: agent.input ?? {},
      context: sharedContext,
    };
  }
}
