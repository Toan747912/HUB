import { MetricsService } from '../../../../../../infrastructure/observability/metrics.service';
import { TracerService } from '../../../../../../infrastructure/observability/tracer.service';
import { MongoGoalRepository } from '../mongo-goal.repository';

describe('MongoGoalRepository — observability wiring', () => {
  let tracer: { withSpan: jest.Mock };
  let metrics: MetricsService;
  let fakeModel: any;
  let repository: MongoGoalRepository;

  beforeEach(() => {
    tracer = { withSpan: jest.fn(async (_name, _attrs, fn) => fn()) };
    metrics = new MetricsService();
    fakeModel = {
      findById: () => ({ lean: () => ({ exec: () => Promise.resolve(null) }) }),
      findByIdAndDelete: () => ({ exec: () => Promise.resolve(undefined) }),
    };
    repository = new MongoGoalRepository(fakeModel, tracer as unknown as TracerService, metrics);
  });

  it('wraps findById in a span with operation/aggregateId attributes', async () => {
    await repository.findById('goal-1');

    expect(tracer.withSpan).toHaveBeenCalledWith(
      'mongodb.findById',
      expect.objectContaining({ operation: 'findById', aggregateId: 'goal-1' }),
      expect.any(Function),
    );
  });

  it('records mongodb_latency_ms for the operation', async () => {
    await repository.findById('goal-1');
    const text = await metrics.getMetricsText();
    expect(text).toMatch(/mongodb_latency_ms_count\{operation="findById"\} 1/);
  });

  it('records latency even when the underlying operation throws', async () => {
    fakeModel.findByIdAndDelete = () => ({ exec: () => Promise.reject(new Error('DB_FAULT')) });

    await expect(repository.delete('goal-x')).rejects.toThrow('DB_FAULT');

    const text = await metrics.getMetricsText();
    expect(text).toMatch(/mongodb_latency_ms_count\{operation="delete"\} 1/);
  });

  it('works with no tracer/metrics provided (backward compatible)', async () => {
    const plain = new MongoGoalRepository(fakeModel);
    await expect(plain.findById('goal-1')).resolves.toBeNull();
  });
});
