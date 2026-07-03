import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Model, disconnect } from 'mongoose';
import { TracerService } from '../../observability/tracer.service';
import { OutboxEventDocument, OutboxEventSchema } from '../outbox-event.schema';
import { OutboxRepository } from '../outbox.repository';

jest.setTimeout(300_000);

describe('OutboxRepository — observability wiring', () => {
  let mongod: MongoMemoryServer;
  let module: TestingModule;
  let model: Model<OutboxEventDocument>;
  let tracer: { withSpan: jest.Mock };
  let repository: OutboxRepository;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri(), { dbName: 'test-db' }),
        MongooseModule.forFeature([{ name: 'OutboxEvent', schema: OutboxEventSchema }]),
      ],
    }).compile();
    model = module.get<Model<OutboxEventDocument>>(getModelToken('OutboxEvent'));
  });

  beforeEach(() => {
    tracer = { withSpan: jest.fn(async (_name, _attrs, fn) => fn()) };
    repository = new OutboxRepository(model, tracer as unknown as TracerService);
  });

  afterEach(async () => {
    await model.deleteMany({});
  });

  afterAll(async () => {
    await module.close();
    await disconnect();
    await mongod.stop();
  });

  it('wraps findPending in a span', async () => {
    await repository.findPending();
    expect(tracer.withSpan).toHaveBeenCalledWith(
      'outbox.findPending',
      expect.objectContaining({ operation: 'findPending' }),
      expect.any(Function),
    );
  });
});
