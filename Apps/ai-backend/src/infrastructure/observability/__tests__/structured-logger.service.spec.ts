import { RequestContextService } from '../request-context.service';
import { StructuredLoggerService } from '../structured-logger.service';
import { TracerService } from '../tracer.service';

describe('StructuredLoggerService', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('emits a JSON line via console.log on SUCCESS with all required fields', () => {
    const logger = new StructuredLoggerService();
    logger.log({ operation: 'save', status: 'SUCCESS', latencyMs: 12, aggregateId: 'goal-1' });

    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const line = JSON.parse(consoleLogSpy.mock.calls[0][0]);

    expect(line).toEqual(
      expect.objectContaining({
        timestamp: expect.any(String),
        operation: 'save',
        status: 'SUCCESS',
        latencyMs: 12,
        aggregateId: 'goal-1'
      })
    );
  });

  it('emits via console.error on FAILURE and includes errorCode', () => {
    const logger = new StructuredLoggerService();
    logger.log({ operation: 'save', status: 'FAILURE', latencyMs: 3, errorCode: 'DB_FAULT' });

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const line = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
    expect(line.status).toBe('FAILURE');
    expect(line.errorCode).toBe('DB_FAULT');
  });

  it('pulls traceId/spanId from TracerService when an active span exists', async () => {
    const tracer = new TracerService();
    tracer.onModuleInit();
    const logger = new StructuredLoggerService(tracer);

    let line: any;
    await tracer.withSpan('op', { operation: 'op' }, async () => {
      logger.log({ operation: 'op', status: 'SUCCESS', latencyMs: 1 });
      line = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    });

    expect(line.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(line.spanId).toMatch(/^[0-9a-f]{16}$/);
    await tracer.onModuleDestroy();
  });

  it('pulls userId from RequestContextService when present', () => {
    const requestContext = new RequestContextService();
    const logger = new StructuredLoggerService(undefined, requestContext);

    requestContext.run({ traceId: 'ctx-trace', userId: 'user-42' }, () => {
      logger.log({ operation: 'op', status: 'SUCCESS', latencyMs: 1 });
    });

    const line = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(line.userId).toBe('user-42');
    expect(line.traceId).toBe('ctx-trace');
  });

  it('omits userId when no request context is active', () => {
    const requestContext = new RequestContextService();
    const logger = new StructuredLoggerService(undefined, requestContext);

    logger.log({ operation: 'op', status: 'SUCCESS', latencyMs: 1 });

    const line = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(line.userId).toBeUndefined();
  });
});
