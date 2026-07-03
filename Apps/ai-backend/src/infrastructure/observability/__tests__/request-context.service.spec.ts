import { RequestContextService } from '../request-context.service';

describe('RequestContextService', () => {
  let service: RequestContextService;

  beforeEach(() => {
    service = new RequestContextService();
  });

  it('returns undefined outside of run()', () => {
    expect(service.get()).toBeUndefined();
  });

  it('exposes the context set by run() within the callback', () => {
    service.run({ traceId: 't1', userId: 'u1' }, () => {
      expect(service.get()).toEqual({ traceId: 't1', userId: 'u1' });
    });
  });

  it('isolates context across concurrent async operations', async () => {
    const results: string[] = [];

    await Promise.all([
      service.run({ traceId: 'a' }, async () => {
        await new Promise((r) => setTimeout(r, 10));
        results.push(service.get()!.traceId);
      }),
      service.run({ traceId: 'b' }, async () => {
        await new Promise((r) => setTimeout(r, 5));
        results.push(service.get()!.traceId);
      }),
    ]);

    expect(results.sort()).toEqual(['a', 'b']);
  });

  it('is undefined again after run() completes', () => {
    service.run({ traceId: 't2' }, () => undefined);
    expect(service.get()).toBeUndefined();
  });
});
