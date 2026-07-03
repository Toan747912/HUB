import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

type NormalizedErrorBody = {
  success: false;
  error: string;
  message: string;
  details?: unknown;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.normalizeException(exception);

    response.status(status).json({
      ...body,
      details: body.details ?? {
        path: request.url,
        method: request.method,
      },
    });
  }

  private normalizeException(exception: unknown): { status: number; body: NormalizedErrorBody } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();

      if (status === HttpStatus.BAD_REQUEST && this.isValidationPayload(raw)) {
        const rawObj = raw as Record<string, unknown>;

        if (this.isNormalizedEnvelope(rawObj)) {
          const normalizedDetails = Array.isArray(rawObj.details)
            ? rawObj.details
            : (rawObj.details ?? []);
          return {
            status,
            body: {
              success: false,
              error: 'VALIDATION_FAILED',
              message: typeof rawObj.message === 'string' ? rawObj.message : 'Validation failed',
              details: normalizedDetails,
            },
          };
        }

        const validationMessage = Array.isArray(rawObj.message)
          ? rawObj.message.join('; ')
          : 'Validation failed';
        return {
          status,
          body: {
            success: false,
            error: 'VALIDATION_FAILED',
            message: validationMessage,
            details: Array.isArray(rawObj.message) ? rawObj.message : rawObj,
          },
        };
      }

      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        return {
          status,
          body: {
            success: false,
            error: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
          },
        };
      }

      if (typeof raw === 'object' && raw !== null) {
        const rawObj = raw as Record<string, unknown>;

        if (this.isNormalizedEnvelope(rawObj)) {
          return {
            status,
            body: {
              success: false,
              error: typeof rawObj.error === 'string' ? rawObj.error : `HTTP_${status}`,
              message: typeof rawObj.message === 'string' ? rawObj.message : exception.message,
              details: rawObj.details,
            },
          };
        }

        const errorCode =
          typeof rawObj.error === 'string' ? this.toErrorCode(rawObj.error) : `HTTP_${status}`;
        const message =
          typeof rawObj.message === 'string'
            ? rawObj.message
            : Array.isArray(rawObj.message)
              ? rawObj.message.join('; ')
              : exception.message;

        return {
          status,
          body: {
            success: false,
            error: errorCode,
            message,
            details: rawObj.details ?? rawObj,
          },
        };
      }

      return {
        status,
        body: {
          success: false,
          error: `HTTP_${status}`,
          message: exception.message || 'Request failed',
        },
      };
    }

    if (exception instanceof Error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: {
          success: false,
          error: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          details: {
            name: exception.name,
          },
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        success: false,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    };
  }

  private isValidationPayload(
    raw: unknown,
  ): raw is { message: unknown; error?: unknown; statusCode?: unknown } {
    return typeof raw === 'object' && raw !== null && 'message' in raw;
  }

  private isNormalizedEnvelope(raw: Record<string, unknown>): boolean {
    return (
      raw.success === false && typeof raw.error === 'string' && typeof raw.message === 'string'
    );
  }

  private toErrorCode(input: string): string {
    return (
      input
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'REQUEST_FAILED'
    );
  }
}
