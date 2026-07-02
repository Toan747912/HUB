import { Injectable, Logger } from '@nestjs/common';

export type StructuredLogPayload = {
  traceId: string;
  jobId: string;
  step: string;
  latencyMs: number;
  status: 'SUCCESS' | 'FAILED';
  errorType?: string;
  message: string;
  details?: Record<string, unknown>;
};

@Injectable()
export class StructuredLoggerService {
  private readonly logger = new Logger(StructuredLoggerService.name);

  info(payload: StructuredLogPayload): void {
    this.logger.log(JSON.stringify({ timestamp: new Date().toISOString(), ...payload }));
  }

  error(payload: StructuredLogPayload): void {
    this.logger.error(JSON.stringify({ timestamp: new Date().toISOString(), ...payload }));
  }
}
