import { SemanticRole } from '../domain/agent-role';

/**
 * Contract for resolving a semantic role to a concrete agentId. The
 * Coordinator (and anything built on top of it) must go through this
 * interface and must never hardcode an agentId for a role.
 */
export interface IRoleProvider {
  registerRole(role: SemanticRole, agentId: string): void;
  unregisterRole(role: SemanticRole, agentId: string): void;
  resolve(role: SemanticRole): string;
  listRoles(): SemanticRole[];
}
