import { Body, Controller, HttpException, HttpStatus, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { MigrationError } from '../domain/errors/migration.error';
import { MigrationPipeline } from '../orchestration/migration-pipeline.service';
import { RollbackMigrationDto } from './dto/rollback-migration.dto';
import { RunMigrationDto } from './dto/run-migration.dto';
import { ValidateMigrationDto } from './dto/validate-migration.dto';

type ControllerEnvelope = {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
  traceId: string;
};

@Controller('migration')
export class MigrationController {
  constructor(private readonly migrationPipeline: MigrationPipeline) {}

  @Post('run')
  async run(@Body() dto: RunMigrationDto, @Req() req: Request): Promise<ControllerEnvelope> {
    const traceId = this.extractTraceId(req);

    try {
      const data = await this.migrationPipeline.run(dto.jobId, traceId);
      return { success: true, data, traceId };
    } catch (error: unknown) {
      throw this.toHttpException(error, traceId);
    }
  }

  @Post('validate')
  async validate(
    @Body() dto: ValidateMigrationDto,
    @Req() req: Request,
  ): Promise<ControllerEnvelope> {
    const traceId = this.extractTraceId(req);

    try {
      const data = await this.migrationPipeline.validate(dto.jobId, traceId);
      return { success: true, data, traceId };
    } catch (error: unknown) {
      throw this.toHttpException(error, traceId);
    }
  }

  @Post('rollback')
  async rollback(
    @Body() dto: RollbackMigrationDto,
    @Req() req: Request,
  ): Promise<ControllerEnvelope> {
    const traceId = this.extractTraceId(req);

    try {
      const data = await this.migrationPipeline.rollback(dto.jobId, traceId);
      return { success: true, data, traceId };
    } catch (error: unknown) {
      throw this.toHttpException(error, traceId);
    }
  }

  private extractTraceId(req: Request): string {
    const header = req.headers['x-trace-id'];
    if (typeof header === 'string' && header.trim()) {
      return header.trim();
    }

    const reqWithTrace = req as Request & { traceId?: string };
    if (typeof reqWithTrace.traceId === 'string' && reqWithTrace.traceId.trim()) {
      return reqWithTrace.traceId.trim();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private toHttpException(error: unknown, traceId: string): HttpException {
    const normalized = this.normalizeError(error);
    const status =
      normalized.error === 'VALIDATION_FAILED' || normalized.error === 'MIGRATION_VALIDATION_FAILED'
        ? HttpStatus.BAD_REQUEST
        : HttpStatus.INTERNAL_SERVER_ERROR;

    return new HttpException(
      {
        success: false,
        error: normalized.error,
        message: normalized.message,
        details: normalized.details,
        traceId,
      },
      status,
    );
  }

  private normalizeError(error: unknown): MigrationError {
    if (error instanceof MigrationError) {
      return error;
    }

    if (error instanceof Error) {
      return new MigrationError('MIGRATION_CONTROLLER_ERROR', 'Migration request failed', {
        name: error.name,
      });
    }

    return new MigrationError('MIGRATION_CONTROLLER_ERROR', 'Migration request failed');
  }
}
