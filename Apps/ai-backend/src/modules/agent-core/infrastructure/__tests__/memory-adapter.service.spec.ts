import { MemoryStoreService } from '../../../agent-memory/application/memory-store.service';
import { MemoryScope } from '../../../agent-memory/domain/memory-scope';
import { IAgentContext } from '../../domain/interfaces';
import { MemoryAdapterService } from '../memory-adapter.service';

function buildContext(overrides: Partial<IAgentContext> = {}): IAgentContext {
  return { traceId: 'trace-1', userId: 'user-1', sessionId: 'session-1', metadata: {}, ...overrides };
}

describe('MemoryAdapterService', () => {
  let memoryStore: jest.Mocked<Pick<MemoryStoreService, 'get' | 'set'>>;
  let adapter: MemoryAdapterService;

  beforeEach(() => {
    memoryStore = { get: jest.fn(), set: jest.fn() };
    adapter = new MemoryAdapterService(memoryStore as unknown as MemoryStoreService);
  });

  it('read() scopes the lookup by AGENT + userId and unwraps the record value', async () => {
    memoryStore.get.mockResolvedValue({
      id: 'rec-1',
      scope: MemoryScope.AGENT,
      scopeId: 'user-1',
      key: 'plan',
      value: { step: 1 },
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: null,
      version: 1,
      tags: [],
    });

    const result = await adapter.read('plan', buildContext());

    expect(memoryStore.get).toHaveBeenCalledWith(
      { scope: MemoryScope.AGENT, scopeId: 'user-1', key: 'plan' },
      { traceId: 'trace-1', userId: 'user-1' },
    );
    expect(result).toEqual({ step: 1 });
  });

  it('read() returns null when no record exists', async () => {
    memoryStore.get.mockResolvedValue(null);

    const result = await adapter.read('missing', buildContext());

    expect(result).toBeNull();
  });

  it('write() persists the value scoped by AGENT + userId', async () => {
    await adapter.write('plan', { step: 2 }, buildContext());

    expect(memoryStore.set).toHaveBeenCalledWith(
      { scope: MemoryScope.AGENT, scopeId: 'user-1', key: 'plan', value: { step: 2 } },
      { traceId: 'trace-1', userId: 'user-1' },
    );
  });

  it('keeps different userIds isolated from each other', async () => {
    await adapter.write('plan', 'a', buildContext({ userId: 'user-a' }));
    await adapter.write('plan', 'b', buildContext({ userId: 'user-b' }));

    expect(memoryStore.set).toHaveBeenNthCalledWith(
      1,
      { scope: MemoryScope.AGENT, scopeId: 'user-a', key: 'plan', value: 'a' },
      { traceId: 'trace-1', userId: 'user-a' },
    );
    expect(memoryStore.set).toHaveBeenNthCalledWith(
      2,
      { scope: MemoryScope.AGENT, scopeId: 'user-b', key: 'plan', value: 'b' },
      { traceId: 'trace-1', userId: 'user-b' },
    );
  });
});
