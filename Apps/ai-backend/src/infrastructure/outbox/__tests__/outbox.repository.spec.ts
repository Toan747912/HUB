import { PrismaService } from '../../persistence/prisma.service';
import { GoalDomainEvent } from '../../../modules/goal/domain/events/goal-event-metadata';
import { GoalId } from '../../../shared/domain/identifiers';
import { DomainEvent } from '../domain-event.contract';
import { OutboxRepository } from '../outbox.repository';

const makeEvent = (overrides: Partial<GoalDomainEvent> = {}): GoalDomainEvent => ({
  type: 'GoalCreated',
  metadata: {
    eventId: overrides.metadata?.eventId ?? 'evt-1',
    aggregateId: GoalId.create('goal-1'),
    aggregateType: 'Goal',
    aggregateVersion: 1,
    occurredAt: new Date().toISOString(),
    traceId: 'trace-1',
    correlationId: 'corr-1',
    causationId: 'cause-1',
  },
  payload: { foo: 'bar' },
  ...overrides,
});

describe('OutboxRepository — integration', () => {
  let prisma: PrismaService;
  let repository: OutboxRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    repository = new OutboxRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.outboxEvent.deleteMany({});
  });

  // Evidence #6: Outbox persistence
  it('persists events as PENDING and is queryable via findPending', async () => {
    await repository.saveMany([
      makeEvent({ metadata: { ...makeEvent().metadata, eventId: 'evt-a' } }),
    ]);

    const pending = await repository.findPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe('PENDING');
    expect(pending[0].eventType).toBe('GoalCreated');
    expect(pending[0].aggregateId).toBe('goal-1');
  });

  // Core regression this phase exists to prevent: traceId/correlationId/causationId
  // (and aggregateType) must round-trip through persistence verbatim, not be dropped
  // and later fabricated by the relay.
  it('persists traceId/correlationId/causationId/aggregateType verbatim from the in-memory event', async () => {
    const event = makeEvent({
      metadata: {
        ...makeEvent().metadata,
        eventId: 'evt-roundtrip',
        traceId: 'trace-original',
        correlationId: 'corr-original',
        causationId: 'cause-original',
      },
    });
    await repository.saveMany([event]);

    const pending = await repository.findPending();
    const doc = pending.find((d) => d.eventId === 'evt-roundtrip');
    expect(doc?.traceId).toBe('trace-original');
    expect(doc?.correlationId).toBe('corr-original');
    expect(doc?.causationId).toBe('cause-original');
    expect(doc?.aggregateType).toBe('Goal');
  });

  it('stashes per-module metadata fields beyond the base set into the metadata column', async () => {
    // Simulates a Roadmap-shaped event's extra fields (goalId/plannerVersion)
    // flowing through the shared, Goal-agnostic OutboxRepository via the
    // DomainEvent contract — the repository doesn't know about these fields
    // by name, it just preserves whatever isn't part of the known base set.
    const event: DomainEvent = {
      ...makeEvent({ metadata: { ...makeEvent().metadata, eventId: 'evt-extra-metadata' } }),
      metadata: {
        ...makeEvent().metadata,
        eventId: 'evt-extra-metadata',
        goalId: 'goal-1',
        plannerVersion: 'v2',
      } as DomainEvent['metadata'],
    };
    await repository.saveMany([event]);

    const pending = await repository.findPending();
    const doc = pending.find((d) => d.eventId === 'evt-extra-metadata');
    expect(doc?.metadata).toMatchObject({ goalId: 'goal-1', plannerVersion: 'v2' });
  });

  it('saveMany is idempotent on eventId (safe to call twice)', async () => {
    const event = makeEvent({ metadata: { ...makeEvent().metadata, eventId: 'evt-idempotent' } });
    await repository.saveMany([event]);
    await repository.saveMany([event]);

    const count = await repository.countByStatus('PENDING');
    expect(count).toBe(1);
  });

  it('markPublished transitions status and sets publishedAt', async () => {
    await repository.saveMany([
      makeEvent({ metadata: { ...makeEvent().metadata, eventId: 'evt-b' } }),
    ]);
    await repository.markPublished('evt-b');

    const pending = await repository.findPending();
    expect(pending).toHaveLength(0);
    expect(await repository.countByStatus('PUBLISHED')).toBe(1);
  });

  it('markFailed transitions status to FAILED', async () => {
    await repository.saveMany([
      makeEvent({ metadata: { ...makeEvent().metadata, eventId: 'evt-c' } }),
    ]);
    await repository.markFailed('evt-c');

    expect(await repository.countByStatus('FAILED')).toBe(1);
  });

  // Evidence #10: Restart survival
  it('outbox rows survive a disconnect/reconnect cycle (process restart simulation)', async () => {
    await repository.saveMany([
      makeEvent({ metadata: { ...makeEvent().metadata, eventId: 'evt-restart' } }),
    ]);

    // Simulate a process restart with a fresh, independent connection to the same
    // Postgres instance, without disturbing the test module's own connection.
    const freshPrisma = new PrismaService();
    await freshPrisma.$connect();
    const survivedDoc = await freshPrisma.outboxEvent.findUnique({ where: { id: 'evt-restart' } });
    await freshPrisma.$disconnect();

    expect(survivedDoc).not.toBeNull();
    expect(survivedDoc!.status).toBe('PENDING');
  });
});
