import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { GoalRequestWithTrace } from '../middleware/trace.middleware';

@Injectable()
export class TraceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const now = Date.now();
    const http = context.switchToHttp();
    const request = http.getRequest<GoalRequestWithTrace>();
    const response = http.getResponse<{ statusCode?: number }>();

    return next.handle().pipe(
      tap({
        next: () => {
          const entry = {
            traceId: request.traceId ?? 'unknown',
            method: request.method,
            url: request.url,
            statusCode: response.statusCode ?? 200,
            latencyMs: Date.now() - now
          };
          console.log(JSON.stringify(entry));
        },
        error: () => {
          const entry = {
            traceId: request.traceId ?? 'unknown',
            method: request.method,
            url: request.url,
            statusCode: response.statusCode ?? 500,
            latencyMs: Date.now() - now
          };
          console.log(JSON.stringify(entry));
        }
      })
    );
  }
}
