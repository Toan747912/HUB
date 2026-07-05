import { IMemoryRepository } from '../../domain/memory.types';
import { MemoryScope } from '../../domain/memory-scope';
import { MemoryStoreService } from '../memory-store.service';

describe('MemoryStoreService', () => {
  let repository: jest.Mocked<IMemoryRepository>;
  let service: MemoryStoreService;

  beforeEach(() => {
    repository = {
      set: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      list: jest.fn(),
      queryByTag: jest.fn(),
      queryByScope: jest.fn(),
      deleteExpired: jest.fn(),
    };
    service = new MemoryStoreService(repository);
  });

  it('delegates set() to the repository and returns the persisted record', async () => {
    const record = {
      id: 'rec-1',
      scope: MemoryScope.AGENT,
      scopeId: 'agent-1',
      key: 'plan',
      value: { step: 1 },
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: null,
      version: 1,
      tags: [],
    };
    repository.set.mockResolvedValue(record);

    const result = await service.set({ scope: MemoryScope.AGENT, scopeId: 'agent-1', key: 'plan', value: { step: 1 } });

    expect(repository.set).toHaveBeenCalledWith({
      scope: MemoryScope.AGENT,
      scopeId: 'agent-1',
      key: 'plan',
      value: { step: 1 },
    });
    expect(result).toBe(record);
  });

  it('delegates get() and returns null when the repository finds nothing', async () => {
    repository.get.mockResolvedValue(null);

    const result = await service.get({ scope: MemoryScope.AGENT, scopeId: 'agent-1', key: 'missing' });

    expect(result).toBeNull();
    expect(repository.get).toHaveBeenCalledWith({ scope: MemoryScope.AGENT, scopeId: 'agent-1', key: 'missing' });
  });

  it('delegates delete() and propagates the boolean result', async () => {
    repository.delete.mockResolvedValue(true);

    const result = await service.delete({ scope: MemoryScope.SESSION, scopeId: 'session-1', key: 'draft' });

    expect(result).toBe(true);
  });

  it('re-throws repository errors after emitting observability without swallowing them', async () => {
    const failure = new Error('mongo down');
    repository.set.mockRejectedValue(failure);

    await expect(
      service.set({ scope: MemoryScope.AGENT, scopeId: 'agent-1', key: 'plan', value: 1 }),
    ).rejects.toThrow('mongo down');
  });

  it('works without optional observability collaborators (metrics/logger/audit all undefined)', async () => {
    repository.get.mockResolvedValue(null);
    const bareService = new MemoryStoreService(repository);

    await expect(
      bareService.get({ scope: MemoryScope.AGENT, scopeId: 'agent-1', key: 'k' }),
    ).resolves.toBeNull();
  });
});
