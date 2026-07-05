import { Injectable } from '@nestjs/common';
import { AgentDefinition } from '../domain/runtime.types';

@Injectable()
export class AgentRegistryService {
  private readonly agents = new Map<string, AgentDefinition>();

  register(agent: AgentDefinition): void {
    this.agents.set(agent.id, agent);
  }

  get(agentId: string): AgentDefinition | undefined {
    return this.agents.get(agentId);
  }
}
