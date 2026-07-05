import { CoordinationPlan, ICoordinationPlanRepository } from '../../domain/coordination-plan';
import { CoordinatorRegistryService } from '../coordinator-registry.service';

function plan(planId: string): CoordinationPlan {
  return {
    planId,
    agents: [],
    executionOrder: [],
    sharedMemoryScopes: [],
    executionPolicy: 'Sequential',
    dependencies: {},
    expectedOutputs: [],
  };
}

describe('CoordinatorRegistryService', () => {
  it('returns undefined for a planId that was never registered', () => {
    const registry = new CoordinatorRegistryService();
    expect(registry.get('missing-plan')).toBeUndefined();
  });

  it('returns the plan previously registered under its planId', () => {
    const registry = new CoordinatorRegistryService();
    const registered = plan('plan-1');

    registry.register(registered);

    expect(registry.get('plan-1')).toBe(registered);
  });

  it('overwrites a previously registered plan with the same planId', () => {
    const registry = new CoordinatorRegistryService();
    registry.register(plan('plan-1'));
    const updated = plan('plan-1');

    registry.register(updated);

    expect(registry.get('plan-1')).toBe(updated);
  });

  describe('restart recovery', () => {
    function fakeRepository(): jest.Mocked<ICoordinationPlanRepository> {
      return {
        create: jest.fn().mockResolvedValue(undefined),
        findById: jest.fn(),
        findRecent: jest.fn().mockResolvedValue([]),
      };
    }

    it('register() persists to the repository in the background without blocking', () => {
      const repository = fakeRepository();
      const registry = new CoordinatorRegistryService(repository);

      registry.register(plan('plan-1'));

      expect(registry.get('plan-1')).toBeDefined();
      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ planId: 'plan-1' }));
    });

    it('onModuleInit() repopulates the cache from the repository after a simulated restart', async () => {
      const repository = fakeRepository();
      repository.findRecent.mockResolvedValue([plan('recovered-plan')]);
      const registry = new CoordinatorRegistryService(repository);

      expect(registry.get('recovered-plan')).toBeUndefined();

      await registry.onModuleInit();

      expect(registry.get('recovered-plan')).toBeDefined();
    });

    it('is a no-op with no repository configured', async () => {
      const registry = new CoordinatorRegistryService();
      await expect(registry.onModuleInit()).resolves.toBeUndefined();
    });
  });
});
