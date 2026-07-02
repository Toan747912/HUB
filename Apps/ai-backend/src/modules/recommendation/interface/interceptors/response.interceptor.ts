import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { RecommendationRequestWithTrace } from '../middleware/trace.middleware';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RecommendationRequestWithTrace>();
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        error: null,
        traceId: request.traceId ?? 'unknown'
      }))
    );
  }
}
