import { PrismaService } from '../../persistence/prisma.service';
import { TracerService } from '../../observability/tracer.service';
import { OutboxRepository } from '../outbox.repository';

describe('OutboxRepository — observability wiring', () => {
  let prisma: PrismaService;
  let tracer: { withSpan: jest.Mock };
  let repository: OutboxRepository;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
  });

  beforeEach(() => {
    tracer = { withSpan: jest.fn(async (_name, _attrs, fn) => fn()) };
    repository = new OutboxRepository(prisma, tracer as unknown as TracerService);
  });

  afterEach(async () => {
    await prisma.outboxEvent.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
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
