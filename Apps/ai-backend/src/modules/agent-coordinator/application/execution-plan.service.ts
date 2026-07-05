import { Injectable } from '@nestjs/common';
import { CoordinationPlan, CoordinationPlanInput, ExecutionGroup } from '../domain/coordination-plan';
import {
  ALLOWED_SHARED_MEMORY_SCOPES,
  CoordinationErrorCode,
  CoordinationExecutionError,
} from '../domain/coordination.types';

/**
 * Resolves a caller-supplied CoordinationPlanInput into a fully ordered
 * CoordinationPlan: validates that every dependency refers to a known agent,
 * detects cycles, and groups agents with no dependency relationship between
 * them into the same execution group (planned as parallel, executed
 * sequentially by the coordinator - see work package WP-AI-03G).
 */
@Injectable()
export class ExecutionPlanService {
  buildPlan(input: CoordinationPlanInput): CoordinationPlan {
    for (const scope of input.sharedMemoryScopes) {
      if (!(ALLOWED_SHARED_MEMORY_SCOPES as readonly string[]).includes(scope)) {
        throw new CoordinationExecutionError(
          CoordinationErrorCode.INVALID_MEMORY_SCOPE,
          `Memory scope "${scope}" may not be used for agent-to-agent data exchange; allowed: ${ALLOWED_SHARED_MEMORY_SCOPES.join(', ')}`,
        );
      }
    }

    const knownAgentIds = new Set(input.agents.map((agent) => agent.agentId));

    for (const agent of input.agents) {
      for (const dependencyId of agent.dependsOn ?? []) {
        if (!knownAgentIds.has(dependencyId)) {
          throw new CoordinationExecutionError(
            CoordinationErrorCode.UNKNOWN_DEPENDENCY,
            `Agent "${agent.agentId}" depends on unknown agent "${dependencyId}"`,
            agent.agentId,
          );
        }
      }
    }

    const executionOrder = this.topologicalGroups(input);

    return {
      planId: input.planId,
      agents: input.agents,
      executionOrder,
      sharedMemoryScopes: input.sharedMemoryScopes,
      executionPolicy: input.executionPolicy ?? 'Sequential',
      dependencies: Object.fromEntries(input.agents.map((agent) => [agent.agentId, agent.dependsOn ?? []])),
      expectedOutputs: input.expectedOutputs ?? [],
    };
  }

  private topologicalGroups(input: CoordinationPlanInput): ExecutionGroup[] {
    const remaining = new Map(input.agents.map((agent) => [agent.agentId, agent]));
    const resolved = new Set<string>();
    const groups: ExecutionGroup[] = [];

    while (remaining.size > 0) {
      const ready = [...remaining.values()].filter((agent) =>
        (agent.dependsOn ?? []).every((dependencyId) => resolved.has(dependencyId)),
      );

      if (ready.length === 0) {
        throw new CoordinationExecutionError(
          CoordinationErrorCode.CYCLIC_DEPENDENCY,
          `Cyclic dependency detected among agents: ${[...remaining.keys()].join(', ')}`,
        );
      }

      for (const agent of ready) {
        remaining.delete(agent.agentId);
        resolved.add(agent.agentId);
      }

      groups.push({
        mode: ready.length === 1 ? 'sequential' : 'parallel-planned',
        agents: ready,
      });
    }

    if (groups.length === 1 && groups[0].agents.length === 1) {
      groups[0].mode = 'single';
    }

    return groups;
  }
}
