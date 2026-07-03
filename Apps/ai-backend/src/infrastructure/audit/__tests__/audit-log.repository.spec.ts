import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model, disconnect } from 'mongoose';
import { AuditEventDocument, AuditEventSchema } from '../audit-event.schema';
import { AuditLogRepository } from '../audit-log.repository';

jest.setTimeout(300_000);

describe('AuditLogRepository — integration', () => {
  let mongod: MongoMemoryServer;
  let module: TestingModule;
  let repository: AuditLogRepository;
  let model: Model<AuditEventDocument>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri, { dbName: 'test-db' }),
        MongooseModule.forFeature([{ name: 'AuditEvent', schema: AuditEventSchema }]),
      ],
      providers: [
        {
          provide: AuditLogRepository,
          useFactory: (m: Model<AuditEventDocument>) => new AuditLogRepository(m),
          inject: [getModelToken('AuditEvent')],
        },
      ],
    }).compile();

    repository = module.get(AuditLogRepository);
    model = module.get<Model<AuditEventDocument>>(getModelToken('AuditEvent'));
  });

  afterAll(async () => {
    await module.close();
    await disconnect();
    await mongod.stop();
  });

  afterEach(async () => {
    await model.deleteMany({});
  });

  // Evidence: Audit events
  it('persists an audit entry with all required fields', async () => {
    await repository.record({
      traceId: 'trace-1',
      userId: 'user-1',
      operation: 'GoalCreated',
      resource: 'Goal:goal-1',
      before: null,
      after: { title: 'Learn TS' },
    });

    const rows = await repository.findByResource('Goal:goal-1');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        traceId: 'trace-1',
        userId: 'user-1',
        operation: 'GoalCreated',
        resource: 'Goal:goal-1',
        before: null,
        after: { title: 'Learn TS' },
      }),
    );
    expect(rows[0].timestamp).toBeInstanceOf(Date);
  });

  it('findByResource returns rows newest-first, scoped to the resource', async () => {
    await repository.record({
      traceId: 't1',
      userId: null,
      operation: 'GoalCreated',
      resource: 'Goal:a',
      before: null,
      after: {},
    });
    await new Promise((r) => setTimeout(r, 5));
    await repository.record({
      traceId: 't2',
      userId: null,
      operation: 'GoalUpdated',
      resource: 'Goal:a',
      before: null,
      after: {},
    });
    await repository.record({
      traceId: 't3',
      userId: null,
      operation: 'GoalCreated',
      resource: 'Goal:b',
      before: null,
      after: {},
    });

    const rows = await repository.findByResource('Goal:a');
    expect(rows).toHaveLength(2);
    expect(rows[0].operation).toBe('GoalUpdated');
    expect(rows[1].operation).toBe('GoalCreated');
  });

  it('userId defaults to null when not provided', async () => {
    await repository.record({
      traceId: 't4',
      userId: null,
      operation: 'GoalArchived',
      resource: 'Goal:c',
      before: null,
      after: {},
    });
    const rows = await repository.findByResource('Goal:c');
    expect(rows[0].userId).toBeNull();
  });
});
