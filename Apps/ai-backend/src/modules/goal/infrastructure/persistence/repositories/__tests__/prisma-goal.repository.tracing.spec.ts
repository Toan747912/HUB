import { MetricsService } from '../../../../../../infrastructure/observability/metrics.service';
import { TracerService } from '../../../../../../infrastructure/observability/tracer.service';
import { PrismaService } from '../../../../../../infrastructure/persistence/prisma.service';
import { PrismaGoalRepository } from '../prisma-goal.repository';

describe('PrismaGoalRepository — observability wiring', () => {
  let tracer: { withSpan: jest.Mock };
  let metrics: MetricsService;
  let fakePrisma: any;
  let repository: PrismaGoalRepository;

  beforeEach(() => {
    tracer = { withSpan: jest.fn(async (_name, _attrs, fn) => fn()) };
    metrics = new MetricsService();
    fakePrisma = {
      goal: {
        findUnique: () => Promise.resolve(null),
        deleteMany: () => Promise.resolve({ count: 0 }),
      },
    };
    repository = new PrismaGoalRepository(
      fakePrisma as unknown as PrismaService,
      tracer as unknown as TracerService,
      metrics,
    );
  });

  it('wraps findById in a span with operation/aggregateId attributes', async () => {
    await repository.findById('goal-1');

    expect(tracer.withSpan).toHaveBeenCalledWith(
      'postgres.findById',
      expect.objectContaining({ operation: 'findById', aggregateId: 'goal-1' }),
      expect.any(Function),
    );
  });

  it('records db_latency_ms for the operation', async () => {
    await repository.findById('goal-1');
    const text = await metrics.getMetricsText();
    expect(text).toMatch(/db_latency_ms_count\{operation="findById"\} 1/);
  });

  it('records latency even when the underlying operation throws', async () => {
    fakePrisma.goal.deleteMany = () => Promise.reject(new Error('DB_FAULT'));

    await expect(repository.delete('goal-x')).rejects.toThrow('DB_FAULT');

    const text = await metrics.getMetricsText();
    expect(text).toMatch(/db_latency_ms_count\{operation="delete"\} 1/);
  });

  it('works with no tracer/metrics provided (backward compatible)', async () => {
    const plain = new PrismaGoalRepository(fakePrisma as unknown as PrismaService);
    await expect(plain.findById('goal-1')).resolves.toBeNull();
  });
});
