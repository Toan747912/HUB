import { Injectable } from '@nestjs/common';
import { RequestContextService } from './request-context.service';
import { TracerService } from './tracer.service';

export interface StructuredLogEntry {
  operation: string;
  status: 'SUCCESS' | 'FAILURE';
  latencyMs: number;
  aggregateId?: string;
  errorCode?: string;
}

export interface StructuredLogLine {
  timestamp: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  aggregateId?: string;
  operation: string;
  latencyMs: number;
  status: 'SUCCESS' | 'FAILURE';
  errorCode?: string;
}

@Injectable()
export class StructuredLoggerService {
  constructor(
    private readonly tracer?: TracerService,
    private readonly requestContext?: RequestContextService,
  ) {}

  log(entry: StructuredLogEntry): void {
    const line = this.buildLine(entry);
    const serialized = JSON.stringify(line);
    if (entry.status === 'FAILURE') {
      // eslint-disable-next-line no-console
      console.error(serialized);
    } else {
      // eslint-disable-next-line no-console
      console.log(serialized);
    }
  }

  buildLine(entry: StructuredLogEntry): StructuredLogLine {
    const traceContext = this.tracer?.getCurrentTraceContext();
    const requestContext = this.requestContext?.get();

    return {
      timestamp: new Date().toISOString(),
      traceId: traceContext?.traceId ?? requestContext?.traceId,
      spanId: traceContext?.spanId ?? requestContext?.spanId,
      userId: requestContext?.userId,
      aggregateId: entry.aggregateId,
      operation: entry.operation,
      latencyMs: entry.latencyMs,
      status: entry.status,
      errorCode: entry.errorCode,
    };
  }
}
