import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export type SessionRequestWithTrace = Request & { traceId?: string };

@Injectable()
export class TraceMiddleware implements NestMiddleware {
  use(req: SessionRequestWithTrace, res: Response, next: NextFunction): void {
    const headerValue = req.header('x-trace-id');
    const traceId = headerValue && headerValue.trim().length > 0 ? headerValue : randomUUID();
    req.traceId = traceId;
    res.setHeader('x-trace-id', traceId);
    next();
  }
}
