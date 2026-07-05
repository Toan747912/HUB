import { TracerService } from '../tracer.service';

// NodeTracerProvider.register() only takes effect once per process (OTel's global
// ProxyTracerProvider freezes to the first real provider registered) — so a single
// TracerService is created for the whole file and its in-memory exporter is reset
// between tests, matching how a real singleton app registers telemetry exactly once.
describe('TracerService', () => {
  let tracer: TracerService;

  beforeAll(() => {
    tracer = new TracerService();
    tracer.onModuleInit();
  });

  beforeEach(() => {
    tracer.resetForTesting();
  });

  afterAll(async () => {
    await tracer.onModuleDestroy();
  });

  // Evidence: Telemetry initialization
  it('initializes without an OTLP endpoint configured (fallback exporter)', () => {
    expect(tracer.isInitialized()).toBe(true);
  });

  it('getCurrentTraceContext returns null outside any span', () => {
    expect(tracer.getCurrentTraceContext()).toBeNull();
  });

  it('getCurrentTraceContext returns a valid traceId/spanId inside withSpan', async () => {
    let captured: ReturnType<TracerService['getCurrentTraceContext']> = null;
    await tracer.withSpan('test-op', { operation: 'test-op' }, async () => {
      captured = tracer.getCurrentTraceContext();
    });

    expect(captured).not.toBeNull();
    expect(captured!.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(captured!.spanId).toMatch(/^[0-9a-f]{16}$/);
  });

  // Evidence: Trace propagation (parent/child span relationship)
  it('nested withSpan calls produce a child span whose parent is the outer span', async () => {
    await tracer.withSpan('parent-op', { operation: 'parent-op' }, async () => {
      await tracer.withSpan('child-op', { operation: 'child-op' }, async () => {
        // no-op body
      });
    });

    const spans = tracer.getFinishedSpansForTesting();
    const parentSpan = spans.find((s) => s.name === 'parent-op')!;
    const childSpan = spans.find((s) => s.name === 'child-op')!;

    expect(parentSpan).toBeDefined();
    expect(childSpan).toBeDefined();
    expect(childSpan.parentSpanContext?.spanId).toBe(parentSpan.spanContext().spanId);
    expect(childSpan.spanContext().traceId).toBe(parentSpan.spanContext().traceId);
  });

  it('every span carries the operation and aggregateId attributes', async () => {
    await tracer.withSpan(
      'postgres.save',
      { operation: 'save', aggregateId: 'goal-1' },
      async () => undefined,
    );

    const [span] = tracer.getFinishedSpansForTesting();
    expect(span.attributes['operation']).toBe('save');
    expect(span.attributes['aggregateId']).toBe('goal-1');
  });

  it('marks the span as ERROR and rethrows when the wrapped function throws', async () => {
    await expect(
      tracer.withSpan('failing-op', { operation: 'failing-op' }, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    const [span] = tracer.getFinishedSpansForTesting();
    expect(span.status.code).toBe(2); // SpanStatusCode.ERROR
  });

  // Evidence: Trace propagation from an incoming header
  it('extractContextFromHeaders honors a valid W3C traceparent header', () => {
    const traceId = '4bf92f3577b34da6a3ce929d0e0e4736';
    const spanId = '00f067aa0ba902b7';
    const ctx = tracer.extractContextFromHeaders({ traceparent: `00-${traceId}-${spanId}-01` });

    // Starting a span within this context should chain to the remote parent's traceId.
    return tracer
      .withSpan('downstream-op', { operation: 'downstream-op' }, async () => undefined, ctx)
      .then(() => {
        const span = tracer.getFinishedSpansForTesting().find((s) => s.name === 'downstream-op')!;
        expect(span.spanContext().traceId).toBe(traceId);
        expect(span.parentSpanContext?.spanId).toBe(spanId);
      });
  });

  it('extractContextFromHeaders falls back to the active context when the header is missing/malformed', () => {
    const ctx1 = tracer.extractContextFromHeaders({});
    const ctx2 = tracer.extractContextFromHeaders({ traceparent: 'garbage' });
    expect(ctx1).toBeDefined();
    expect(ctx2).toBeDefined();
  });
});
