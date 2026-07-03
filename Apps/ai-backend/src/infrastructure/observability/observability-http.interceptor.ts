import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, firstValueFrom, from } from 'rxjs';
import { MetricsService } from './metrics.service';
import { RequestContextService } from './request-context.service';
import { StructuredLoggerService } from './structured-logger.service';
import { TracerService } from './tracer.service';

@Injectable()
export class ObservabilityHttpInterceptor implements NestInterceptor {
  constructor(
    private readonly tracer: TracerService,
    private readonly metrics: MetricsService,
    private readonly requestContext: RequestContextService,
    private readonly logger: StructuredLoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return from(this.run(context, next));
  }

  private async run(context: ExecutionContext, next: CallHandler): Promise<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { traceId?: string }>();
    const res = http.getResponse<Response>();
    const startedAt = Date.now();

    const method = req.method;
    const route = req.route?.path ?? req.originalUrl?.split('?')[0] ?? req.url;
    const userId = (req.headers['x-user-id'] as string | undefined) ?? undefined;

    const parentOtelContext = this.tracer.extractContextFromHeaders(
      req.headers as Record<string, string | string[] | undefined>,
    );

    return this.requestContext.run({ traceId: req.traceId ?? 'unknown', userId }, () =>
      this.tracer.withSpan(
        `HTTP ${method} ${route}`,
        { operation: `${method} ${route}`, 'http.method': method, 'http.route': route },
        async () => {
          const traceContext = this.tracer.getCurrentTraceContext();
          const requestCtx = this.requestContext.get();
          if (requestCtx && traceContext) {
            requestCtx.spanId = traceContext.spanId;
          }

          try {
            const result = await firstValueFrom(next.handle());
            this.finish(method, route, res.statusCode || 200, startedAt, userId, route);
            return result;
          } catch (error) {
            const status = res.statusCode >= 400 ? res.statusCode : 500;
            this.finish(method, route, status, startedAt, userId, route, error);
            throw error;
          }
        },
        parentOtelContext,
      ),
    );
  }

  private finish(
    method: string,
    route: string,
    status: number,
    startedAt: number,
    _userId: string | undefined,
    operation: string,
    error?: unknown,
  ): void {
    const latencyMs = Date.now() - startedAt;
    this.metrics.recordHttpRequest(method, route, status, latencyMs / 1000);
    this.logger.log({
      operation: `${method} ${operation}`,
      status: error ? 'FAILURE' : 'SUCCESS',
      latencyMs,
      errorCode: error instanceof Error ? error.constructor.name : undefined,
    });
  }
}
