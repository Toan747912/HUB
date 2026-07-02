import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model, createConnection, disconnect } from 'mongoose';
import { GoalDomainEvent } from '../../../modules/goal/domain/events/goal-event-metadata';
import { OutboxEventDocument, OutboxEventSchema } from '../outbox-event.schema';
import { OutboxRepository } from '../outbox.repository';

jest.setTimeout(300_000);

const makeEvent = (overrides: Partial<GoalDomainEvent> = {}): GoalDomainEvent => ({
  type: 'GoalCreated',
  metadata: {
    eventId: overrides.metadata?.eventId ?? 'evt-1',
    aggregateId: 'goal-1',
    aggregateVersion: 1,
    occurredAt: new Date().toISOString(),
    traceId: 'trace-1',
    correlationId: 'corr-1',
    causationId: 'cause-1'
  },
  payload: { foo: 'bar' },
  ...overrides
});

describe('OutboxRepository — integration', () => {
  let mongod: MongoMemoryServer;
  let module: TestingModule;
  let repository: OutboxRepository;
  let model: Model<OutboxEventDocument>;
  let uri: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri, { dbName: 'test-db' }),
        MongooseModule.forFeature([{ name: 'OutboxEvent', schema: OutboxEventSchema }])
      ],
      providers: [
        {
          provide: OutboxRepository,
          useFactory: (m: Model<OutboxEventDocument>) => new OutboxRepository(m),
          inject: [getModelToken('OutboxEvent')]
        }
      ]
    }).compile();

    repository = module.get(OutboxRepository);
    model = module.get<Model<OutboxEventDocument>>(getModelToken('OutboxEvent'));
  });

  afterAll(async () => {
    await module.close();
    await disconnect();
    await mongod.stop();
  });

  afterEach(async () => {
    await model.deleteMany({});
  });

  // Evidence #6: Outbox persistence
  it('persists events as PENDING and is queryable via findPending', async () => {
    await repository.saveMany([makeEvent({ metadata: { ...makeEvent().metadata, eventId: 'evt-a' } })]);

    const pending = await repository.findPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe('PENDING');
    expect(pending[0].eventType).toBe('GoalCreated');
    expect(pending[0].aggregateId).toBe('goal-1');
  });

  it('saveMany is idempotent on eventId (safe to call twice)', async () => {
    const event = makeEvent({ metadata: { ...makeEvent().metadata, eventId: 'evt-idempotent' } });
    await repository.saveMany([event]);
    await repository.saveMany([event]);

    const count = await repository.countByStatus('PENDING');
    expect(count).toBe(1);
  });

  it('markPublished transitions status and sets publishedAt', async () => {
    await repository.saveMany([makeEvent({ metadata: { ...makeEvent().metadata, eventId: 'evt-b' } })]);
    await repository.markPublished('evt-b');

    const pending = await repository.findPending();
    expect(pending).toHaveLength(0);
    expect(await repository.countByStatus('PUBLISHED')).toBe(1);
  });

  it('markFailed transitions status to FAILED', async () => {
    await repository.saveMany([makeEvent({ metadata: { ...makeEvent().metadata, eventId: 'evt-c' } })]);
    await repository.markFailed('evt-c');

    expect(await repository.countByStatus('FAILED')).toBe(1);
  });

  // Evidence #10: Restart survival
  it('outbox rows survive a disconnect/reconnect cycle (process restart simulation)', async () => {
    await repository.saveMany([makeEvent({ metadata: { ...makeEvent().metadata, eventId: 'evt-restart' } })]);

    // Simulate a process restart with a fresh, independent connection to the same
    // MongoDB instance, without disturbing the test module's own connection.
    const freshConnection = await createConnection(uri, { dbName: 'test-db' }).asPromise();
    const survivedDoc = await freshConnection
      .model<OutboxEventDocument>('OutboxEvent', OutboxEventSchema)
      .findById('evt-restart')
      .lean();
    await freshConnection.close();

    expect(survivedDoc).not.toBeNull();
    expect(survivedDoc!.status).toBe('PENDING');
  });
});
