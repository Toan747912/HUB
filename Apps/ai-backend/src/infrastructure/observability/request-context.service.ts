import { Injectable } from '@nestjs/common';
import { RequestContext, requestContextStorage } from './request-context';

@Injectable()
export class RequestContextService {
  run<T>(context: RequestContext, fn: () => T): T {
    return requestContextStorage.run(context, fn);
  }

  get(): RequestContext | undefined {
    return requestContextStorage.getStore();
  }
}
