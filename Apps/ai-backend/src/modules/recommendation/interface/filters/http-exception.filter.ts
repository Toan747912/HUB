import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import {
  RecommendationNotFoundError,
  RecommendationStateTransitionError,
  RecommendationValidationError,
  RecommendationVersionConflictError,
} from '../../application/errors/application.errors';
import { RecommendationRequestWithTrace } from '../middleware/trace.middleware';

type ErrorEnvelope = {
  code: string;
  message: string;
  details?: unknown;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<RecommendationRequestWithTrace & Request>();
    const res = ctx.getResponse<Response>();

    const traceId = req.traceId ?? 'unknown';
    const normalized = this.normalize(exception);

    res.status(normalized.status).json({
      success: false,
      data: null,
      error: normalized.error,
      traceId,
    });
  }

  private normalize(exception: unknown): { status: number; error: ErrorEnvelope } {
    if (exception instanceof RecommendationNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        error: {
          code: 'RECOMMENDATION_NOT_FOUND',
          message: exception.message,
        },
      };
    }

    if (exception instanceof RecommendationVersionConflictError) {
      return {
        status: HttpStatus.CONFLICT,
        error: {
          code: 'VERSION_CONFLICT',
          message: exception.message,
        },
      };
    }

    if (
      exception instanceof RecommendationValidationError ||
      exception instanceof RecommendationStateTransitionError
    ) {
      return {
        status: HttpStatus.BAD_REQUEST,
        error: {
          code: 'VALIDATION_ERROR',
          message: exception.message,
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse() as
        { message?: unknown; error?: unknown; details?: unknown } | string;

      if (typeof payload === 'string') {
        return {
          status,
          error: {
            code: `HTTP_${status}`,
            message: payload,
          },
        };
      }

      const message =
        typeof payload.message === 'string'
          ? payload.message
          : Array.isArray(payload.message)
            ? payload.message.join('; ')
            : exception.message;

      const code =
        typeof payload.error === 'string'
          ? payload.error.toUpperCase().replace(/[^A-Z0-9]+/g, '_')
          : `HTTP_${status}`;

      return {
        status,
        error: {
          code,
          message,
          details: payload.details,
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    };
  }
}
