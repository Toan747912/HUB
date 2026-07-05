import { CollaborationExecutionError } from '../../domain/collaboration.types';
import { RoleResolverService } from '../role-resolver.service';

describe('RoleResolverService', () => {
  let resolver: RoleResolverService;

  beforeEach(() => {
    resolver = new RoleResolverService();
  });

  it('throws CollaborationExecutionError when no agent is registered for a role', () => {
    expect(() => resolver.resolve('Reviewer')).toThrow(CollaborationExecutionError);
    expect(() => resolver.resolve('Reviewer')).toThrow(/Reviewer/);
  });

  it('resolves a role to its registered agentId', () => {
    resolver.registerRole('Reviewer', 'reviewer-agent-1');
    expect(resolver.resolve('Reviewer')).toBe('reviewer-agent-1');
  });

  it('never hardcodes an agentId: round-robins across multiple agents bound to the same role', () => {
    resolver.registerRole('Researcher', 'researcher-1');
    resolver.registerRole('Researcher', 'researcher-2');

    expect(resolver.resolve('Researcher')).toBe('researcher-1');
    expect(resolver.resolve('Researcher')).toBe('researcher-2');
    expect(resolver.resolve('Researcher')).toBe('researcher-1');
  });

  it('does not register the same agentId twice for a role', () => {
    resolver.registerRole('Critic', 'critic-1');
    resolver.registerRole('Critic', 'critic-1');

    expect(resolver.resolve('Critic')).toBe('critic-1');
    expect(resolver.resolve('Critic')).toBe('critic-1');
  });

  it('unregisters an agent from a role, falling back to remaining agents', () => {
    resolver.registerRole('Verifier', 'verifier-1');
    resolver.registerRole('Verifier', 'verifier-2');

    resolver.unregisterRole('Verifier', 'verifier-1');

    expect(resolver.resolve('Verifier')).toBe('verifier-2');
  });

  it('removes the role entirely once its last agent is unregistered', () => {
    resolver.registerRole('Tester', 'tester-1');
    resolver.unregisterRole('Tester', 'tester-1');

    expect(() => resolver.resolve('Tester')).toThrow(CollaborationExecutionError);
    expect(resolver.listRoles()).not.toContain('Tester');
  });

  it('supports future/unregistered role names dynamically, without a closed role catalogue', () => {
    resolver.registerRole('CustomFutureRole', 'agent-x');
    expect(resolver.resolve('CustomFutureRole')).toBe('agent-x');
    expect(resolver.listRoles()).toEqual(['CustomFutureRole']);
  });
});
