import { PrismaService } from '../../../../infrastructure/persistence/prisma.service';
import { MemoryScope } from '../../domain/memory-scope';
import { PrismaMemoryRepository } from '../prisma-memory.repository';

describe('PrismaMemoryRepository — integration', () => {
  let prisma: PrismaService;
  let repository: PrismaMemoryRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    repository = new PrismaMemoryRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.memoryRecord.deleteMany({});
  });

  describe('set/get/delete', () => {
    it('persists a record and reads it back', async () => {
      await repository.set({ scope: MemoryScope.AGENT, scopeId: 'agent-1', key: 'plan', value: { step: 1 } });

      const record = await repository.get({ scope: MemoryScope.AGENT, scopeId: 'agent-1', key: 'plan' });
      expect(record).toMatchObject({
        scope: MemoryScope.AGENT,
        scopeId: 'agent-1',
        key: 'plan',
        value: { step: 1 },
        version: 1,
      });
      expect(record?.createdAt).toBeInstanceOf(Date);
      expect(record?.updatedAt).toBeInstanceOf(Date);
    });

    it('returns null for a key that was never set', async () => {
      const record = await repository.get({ scope: MemoryScope.AGENT, scopeId: 'agent-1', key: 'missing' });
      expect(record).toBeNull();
    });

    it('upserts in place and increments version on repeated writes to the same key', async () => {
      await repository.set({ scope: MemoryScope.AGENT, scopeId: 'agent-1', key: 'counter', value: 1 });
      await repository.set({ scope: MemoryScope.AGENT, scopeId: 'agent-1', key: 'counter', value: 2 });

      const record = await repository.get({ scope: MemoryScope.AGENT, scopeId: 'agent-1', key: 'counter' });
      expect(record?.value).toBe(2);
      expect(record?.version).toBe(2);

      const count = await prisma.memoryRecord.count({
        where: { scope: MemoryScope.AGENT, scopeId: 'agent-1', key: 'counter' },
      });
      expect(count).toBe(1);
    });

    it('deletes a record and reports whether one was removed', async () => {
      await repository.set({ scope: MemoryScope.SESSION, scopeId: 'session-1', key: 'draft', value: 'hi' });

      const deleted = await repository.delete({ scope: MemoryScope.SESSION, scopeId: 'session-1', key: 'draft' });
      expect(deleted).toBe(true);

      const record = await repository.get({ scope: MemoryScope.SESSION, scopeId: 'session-1', key: 'draft' });
      expect(record).toBeNull();

      const deletedAgain = await repository.delete({
        scope: MemoryScope.SESSION,
        scopeId: 'session-1',
        key: 'draft',
      });
      expect(deletedAgain).toBe(false);
    });
  });

  describe('scope isolation', () => {
    it('keeps the same key isolated across different scope types', async () => {
      await repository.set({ scope: MemoryScope.AGENT, scopeId: 'x', key: 'shared', value: 'agent-value' });
      await repository.set({ scope: MemoryScope.SESSION, scopeId: 'x', key: 'shared', value: 'session-value' });

      const agentRecord = await repository.get({ scope: MemoryScope.AGENT, scopeId: 'x', key: 'shared' });
      const sessionRecord = await repository.get({ scope: MemoryScope.SESSION, scopeId: 'x', key: 'shared' });

      expect(agentRecord?.value).toBe('agent-value');
      expect(sessionRecord?.value).toBe('session-value');
    });

    it('keeps the same key isolated across different scopeIds within the same scope', async () => {
      await repository.set({ scope: MemoryScope.WORKFLOW, scopeId: 'wf-1', key: 'state', value: 'A' });
      await repository.set({ scope: MemoryScope.WORKFLOW, scopeId: 'wf-2', key: 'state', value: 'B' });

      const wf1 = await repository.list(MemoryScope.WORKFLOW, 'wf-1');
      const wf2 = await repository.list(MemoryScope.WORKFLOW, 'wf-2');

      expect(wf1.map((r) => r.value)).toEqual(['A']);
      expect(wf2.map((r) => r.value)).toEqual(['B']);
    });
  });

  describe('queryByTag / queryByScope', () => {
    it('finds records by tag across scopeIds, optionally filtered by scope', async () => {
      await repository.set({
        scope: MemoryScope.STEP,
        scopeId: 'step-1',
        key: 'a',
        value: 1,
        tags: ['important'],
      });
      await repository.set({
        scope: MemoryScope.STEP,
        scopeId: 'step-2',
        key: 'b',
        value: 2,
        tags: ['important', 'extra'],
      });
      await repository.set({ scope: MemoryScope.STEP, scopeId: 'step-3', key: 'c', value: 3, tags: ['other'] });

      const tagged = await repository.queryByTag('important');
      expect(tagged.map((r) => r.key).sort()).toEqual(['a', 'b']);

      const taggedScoped = await repository.queryByTag('important', MemoryScope.STEP);
      expect(taggedScoped).toHaveLength(2);
    });

    it('finds every record for a scope type regardless of scopeId', async () => {
      await repository.set({ scope: MemoryScope.TEMP, scopeId: 't1', key: 'k1', value: 1 });
      await repository.set({ scope: MemoryScope.TEMP, scopeId: 't2', key: 'k2', value: 2 });
      await repository.set({ scope: MemoryScope.GLOBAL, scopeId: 'g', key: 'k3', value: 3 });

      const tempRecords = await repository.queryByScope(MemoryScope.TEMP);
      expect(tempRecords.map((r) => r.key).sort()).toEqual(['k1', 'k2']);
    });
  });

  describe('TTL', () => {
    it('treats a record whose expiresAt is in the past as absent on read', async () => {
      await repository.set({
        scope: MemoryScope.TEMP,
        scopeId: 'ttl-1',
        key: 'expiring',
        value: 'soon-gone',
        ttlMs: -1000,
      });

      const record = await repository.get({ scope: MemoryScope.TEMP, scopeId: 'ttl-1', key: 'expiring' });
      expect(record).toBeNull();
    });

    it('excludes expired records from list/queryByTag/queryByScope', async () => {
      await repository.set({
        scope: MemoryScope.TEMP,
        scopeId: 'ttl-2',
        key: 'expired',
        value: 'gone',
        ttlMs: -1000,
        tags: ['ttl-test'],
      });
      await repository.set({
        scope: MemoryScope.TEMP,
        scopeId: 'ttl-2',
        key: 'fresh',
        value: 'still-here',
        ttlMs: 60_000,
        tags: ['ttl-test'],
      });

      const listed = await repository.list(MemoryScope.TEMP, 'ttl-2');
      expect(listed.map((r) => r.key)).toEqual(['fresh']);

      const tagged = await repository.queryByTag('ttl-test');
      expect(tagged.map((r) => r.key)).toEqual(['fresh']);
    });

    it('deleteExpired removes only records past their expiry and reports the count', async () => {
      await repository.set({
        scope: MemoryScope.TEMP,
        scopeId: 'gc-1',
        key: 'old',
        value: 1,
        ttlMs: -1000,
      });
      await repository.set({
        scope: MemoryScope.TEMP,
        scopeId: 'gc-1',
        key: 'new',
        value: 2,
        ttlMs: 60_000,
      });
      await repository.set({ scope: MemoryScope.TEMP, scopeId: 'gc-1', key: 'no-ttl', value: 3 });

      const deletedCount = await repository.deleteExpired(new Date());
      expect(deletedCount).toBe(1);

      const remaining = await prisma.memoryRecord.findMany({
        where: { scope: MemoryScope.TEMP, scopeId: 'gc-1' },
      });
      expect(remaining.map((r) => r.key).sort()).toEqual(['new', 'no-ttl']);
    });
  });

  it('throws when the underlying Prisma client throws (connection failure handling)', async () => {
    const faultyPrisma = {
      memoryRecord: {
        upsert: () => Promise.reject(new Error('DB_FAULT')),
        findUnique: () => Promise.reject(new Error('DB_FAULT')),
        findMany: () => Promise.reject(new Error('DB_FAULT')),
        deleteMany: () => Promise.reject(new Error('DB_FAULT')),
      },
    } as unknown as PrismaService;

    const faultyRepo = new PrismaMemoryRepository(faultyPrisma);

    await expect(
      faultyRepo.set({ scope: MemoryScope.AGENT, scopeId: 'x', key: 'k', value: 1 }),
    ).rejects.toThrow('DB_FAULT');
    await expect(
      faultyRepo.get({ scope: MemoryScope.AGENT, scopeId: 'x', key: 'k' }),
    ).rejects.toThrow('DB_FAULT');
    await expect(faultyRepo.list(MemoryScope.AGENT, 'x')).rejects.toThrow('DB_FAULT');
    await expect(
      faultyRepo.delete({ scope: MemoryScope.AGENT, scopeId: 'x', key: 'k' }),
    ).rejects.toThrow('DB_FAULT');
  });
});
