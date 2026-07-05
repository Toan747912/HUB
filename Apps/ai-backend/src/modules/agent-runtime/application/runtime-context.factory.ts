import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { IAgentContext, IAgentRequest } from '../../agent-core/domain/interfaces';

/**
 * Normalizes the IAgentContext carried on a request into the context every
 * step of a run shares: fills in a traceId if the caller didn't supply one,
 * and returns a fresh object so step execution never mutates the request.
 */
@Injectable()
export class RuntimeContextFactory {
  build(request: IAgentRequest): IAgentContext {
    return {
      traceId: request.context.traceId || randomUUID(),
      userId: request.context.userId,
      sessionId: request.context.sessionId,
      metadata: { ...(request.context.metadata ?? {}) },
    };
  }
}
