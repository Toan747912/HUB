import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  traceId: string;
  spanId?: string;
  userId?: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();
