import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RoadmapRequestWithTrace } from '../middleware/trace.middleware';

@Injectable()
export class TraceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const now = Date.now();
    const http = context.switchToHttp();
    const request = http.getRequest<RoadmapRequestWithTrace>();
    const response = http.getResponse<{ statusCode?: number }>();

    return next.handle().pipe(
      tap({
        next: () => {
          console.log(
            JSON.stringify({
              traceId: request.traceId ?? 'unknown',
              method: request.method,
              url: request.url,
              statusCode: response.statusCode ?? 200,
              latencyMs: Date.now() - now,
            }),
          );
        },
        error: () => {
          console.log(
            JSON.stringify({
              traceId: request.traceId ?? 'unknown',
              method: request.method,
              url: request.url,
              statusCode: response.statusCode ?? 500,
              latencyMs: Date.now() - now,
            }),
          );
        },
      }),
    );
  }
}
