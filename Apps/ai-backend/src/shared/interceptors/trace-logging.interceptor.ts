import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { Observable, catchError, tap, throwError } from 'rxjs';

@Injectable()
export class TraceLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('TraceLogging');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { traceId?: string }>();
    const res = http.getResponse<Response>();
    const startedAt = Date.now();

    const traceId = req.traceId ?? req.headers['x-trace-id']?.toString() ?? randomUUID();
    req.traceId = traceId;
    res.setHeader('x-trace-id', traceId);

    return next.handle().pipe(
      tap((data: any) => {
        const latencyMs = Date.now() - startedAt;
        this.logger.log(
          JSON.stringify({
            traceId,
            route: req.originalUrl || req.url,
            latencyMs,
            status: res.statusCode,
            errorType: null,
            confidence:
              typeof data?.output?.confidence === 'number' ? data.output.confidence : null,
          }),
        );
      }),
      catchError((err: unknown) => {
        const latencyMs = Date.now() - startedAt;
        const errorType =
          err &&
          typeof err === 'object' &&
          'name' in err &&
          typeof (err as { name?: unknown }).name === 'string'
            ? (err as { name: string }).name
            : 'UnknownError';

        this.logger.error(
          JSON.stringify({
            traceId,
            route: req.originalUrl || req.url,
            latencyMs,
            status: res.statusCode >= 400 ? res.statusCode : 500,
            errorType,
            confidence: null,
          }),
        );

        return throwError(() => err);
      }),
    );
  }
}
