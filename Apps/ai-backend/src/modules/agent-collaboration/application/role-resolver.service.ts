import { Injectable } from '@nestjs/common';
import { SemanticRole } from '../domain/agent-role';
import { CollaborationErrorCode, CollaborationExecutionError } from '../domain/collaboration.types';
import { IRoleProvider } from '../interfaces/role-provider.interface';

/**
 * Resolves a semantic role ("Need Reviewer") to a concrete agentId, so the
 * Coordinator (and CollaborationService/ReasoningService built on top of it)
 * never hardcodes an agentId for a role. Multiple agents may be bound to the
 * same role; resolve() round-robins across them since this codebase has no
 * agent-availability concept yet (see agent-lifecycle: LifecycleState tracks
 * a single run's progress, not general idleness) - true availability-aware
 * selection is flagged as remaining work.
 */
@Injectable()
export class RoleResolverService implements IRoleProvider {
  private readonly bindings = new Map<SemanticRole, string[]>();

  registerRole(role: SemanticRole, agentId: string): void {
    const agents = this.bindings.get(role) ?? [];
    if (!agents.includes(agentId)) {
      agents.push(agentId);
    }
    this.bindings.set(role, agents);
  }

  unregisterRole(role: SemanticRole, agentId: string): void {
    const agents = this.bindings.get(role);
    if (!agents) {
      return;
    }
    const remaining = agents.filter((id) => id !== agentId);
    if (remaining.length > 0) {
      this.bindings.set(role, remaining);
    } else {
      this.bindings.delete(role);
    }
  }

  resolve(role: SemanticRole): string {
    const agents = this.bindings.get(role);
    if (!agents || agents.length === 0) {
      throw new CollaborationExecutionError(
        CollaborationErrorCode.ROLE_NOT_FOUND,
        `No agent is registered for role "${role}"`,
        role,
      );
    }

    const [agentId, ...rest] = agents;
    if (rest.length > 0) {
      this.bindings.set(role, [...rest, agentId]);
    }
    return agentId;
  }

  listRoles(): SemanticRole[] {
    return Array.from(this.bindings.keys());
  }
}
