import { ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { MetricsService } from '../metrics.service';
import { ObservabilityHttpInterceptor } from '../observability-http.interceptor';
import { RequestContextService } from '../request-context.service';
import { StructuredLoggerService } from '../structured-logger.service';
import { TracerService } from '../tracer.service';

describe('ObservabilityHttpInterceptor', () => {
  let tracer: TracerService;
  let metrics: MetricsService;
  let requestContext: RequestContextService;
  let logger: StructuredLoggerService;
  let interceptor: ObservabilityHttpInterceptor;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    tracer = new TracerService();
    tracer.onModuleInit();
  });

  beforeEach(() => {
    tracer.resetForTesting();
    metrics = new MetricsService();
    requestContext = new RequestContextService();
    logger = new StructuredLoggerService(tracer, requestContext);
    interceptor = new ObservabilityHttpInterceptor(tracer, metrics, requestContext, logger);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  afterAll(async () => {
    await tracer.onModuleDestroy();
  });

  function makeContext(
    overrides: { headers?: Record<string, string>; method?: string } = {},
  ): ExecutionContext {
    const req = {
      method: overrides.method ?? 'GET',
      originalUrl: '/goal',
      url: '/goal',
      route: { path: '/goal' },
      headers: overrides.headers ?? {},
    };
    const res = { statusCode: 201 };
    return {
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    } as unknown as ExecutionContext;
  }

  it('records http_requests_total and http_request_duration_seconds on success', async () => {
    const context = makeContext();
    const next = { handle: () => of({ ok: true }) };

    const result = await new Promise((resolve, reject) => {
      interceptor.intercept(context, next as any).subscribe({ next: resolve, error: reject });
    });

    expect(result).toEqual({ ok: true });
    const text = await metrics.getMetricsText();
    expect(text).toMatch(/http_requests_total\{method="GET",route="\/goal",status="201"\} 1/);
  });

  it('logs a structured SUCCESS line with traceId/spanId populated', async () => {
    const context = makeContext();
    const next = { handle: () => of({ ok: true }) };

    await new Promise((resolve, reject) => {
      interceptor.intercept(context, next as any).subscribe({ next: resolve, error: reject });
    });

    const line = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(line.status).toBe('SUCCESS');
    expect(line.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(line.spanId).toMatch(/^[0-9a-f]{16}$/);
  });

  it('captures userId from the x-user-id header into the request context', async () => {
    const context = makeContext({ headers: { 'x-user-id': 'user-99' } });
    let observedUserId: string | undefined;
    const next = {
      handle: () => {
        observedUserId = requestContext.get()?.userId;
        return of({ ok: true });
      },
    };

    await new Promise((resolve, reject) => {
      interceptor.intercept(context, next as any).subscribe({ next: resolve, error: reject });
    });

    expect(observedUserId).toBe('user-99');
  });

  it('propagates errors and still records metrics/logs on failure', async () => {
    const context = makeContext();
    const next = { handle: () => throwError(() => new Error('handler failed')) };

    await expect(
      new Promise((resolve, reject) => {
        interceptor.intercept(context, next as any).subscribe({ next: resolve, error: reject });
      }),
    ).rejects.toThrow('handler failed');

    const line = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
    expect(line.status).toBe('FAILURE');
    expect(line.errorCode).toBe('Error');
  });

  it('honors an incoming traceparent header for trace propagation', async () => {
    const remoteTraceId = '4bf92f3577b34da6a3ce929d0e0e4736';
    const context = makeContext({
      headers: { traceparent: `00-${remoteTraceId}-00f067aa0ba902b7-01` },
    });
    const next = { handle: () => of({ ok: true }) };

    await new Promise((resolve, reject) => {
      interceptor.intercept(context, next as any).subscribe({ next: resolve, error: reject });
    });

    const spans = tracer.getFinishedSpansForTesting();
    expect(spans[0].spanContext().traceId).toBe(remoteTraceId);
  });
});
