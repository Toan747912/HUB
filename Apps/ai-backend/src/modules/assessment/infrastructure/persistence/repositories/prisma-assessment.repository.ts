import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../../infrastructure/persistence/prisma.service';
import { PrismaTransactionClient } from '../../../../../infrastructure/persistence/with-transaction';
import { Assessment } from '../../../domain/aggregates/assessment.aggregate';
import { IAssessmentRepository } from '../../../application/contracts/assessment-repository.contract';
import { MetricsService } from '../../../../../infrastructure/observability/metrics.service';
import { SpanFactory } from '../../../../../infrastructure/observability/span.factory';
import { TracerService } from '../../../../../infrastructure/observability/tracer.service';
import { AssessmentDocument } from '../documents/assessment.document';
import { AssessmentPersistenceMapper } from '../mappers/assessment-persistence.mapper';

@Injectable()
export class PrismaAssessmentRepository implements IAssessmentRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tracer?: TracerService,
    private readonly metrics?: MetricsService,
  ) {}

  async save(assessment: Assessment, tx?: PrismaTransactionClient): Promise<void> {
    await this.instrumented('save', assessment.getId().toString(), async () => {
      const start = Date.now();
      const doc = AssessmentPersistenceMapper.toDocument(assessment);
      const { _id, createdAt, ...mutableFields } = doc;
      const client = tx ?? this.prisma;
      const jsonFields = {
        latestResult: mutableFields.latestResult as unknown as Prisma.InputJsonValue,
        history: mutableFields.history as unknown as Prisma.InputJsonValue,
      };
      try {
        await client.assessment.upsert({
          where: { id: _id },
          update: {
            goalId: mutableFields.goalId,
            roadmapId: mutableFields.roadmapId,
            learnerId: mutableFields.learnerId,
            status: mutableFields.status,
            aggregateVersion: mutableFields.aggregateVersion,
            invalidatedAt: mutableFields.invalidatedAt,
            ...jsonFields,
            updatedAt: new Date(),
          },
          create: {
            id: _id,
            goalId: mutableFields.goalId,
            roadmapId: mutableFields.roadmapId,
            learnerId: mutableFields.learnerId,
            status: mutableFields.status,
            aggregateVersion: mutableFields.aggregateVersion,
            invalidatedAt: mutableFields.invalidatedAt,
            ...jsonFields,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        this.log('save', assessment.getId().toString(), start, 'SUCCESS');
      } catch (error) {
        this.log('save', assessment.getId().toString(), start, 'FAILURE', error);
        throw error;
      }
    });
  }

  async findById(id: string): Promise<Assessment | null> {
    return this.instrumented('findById', id, async () => {
      const start = Date.now();
      try {
        const row = await this.prisma.assessment.findUnique({ where: { id } });
        this.log('findById', id, start, 'SUCCESS');
        return row ? AssessmentPersistenceMapper.toDomain(this.toDocument(row)) : null;
      } catch (error) {
        this.log('findById', id, start, 'FAILURE', error);
        throw error;
      }
    });
  }

  async findAll(learnerId?: string): Promise<Assessment[]> {
    return this.instrumented('findAll', learnerId ?? '*', async () => {
      const start = Date.now();
      try {
        const rows = await this.prisma.assessment.findMany({
          where: learnerId ? { learnerId } : undefined,
        });
        this.log('findAll', learnerId ?? '*', start, 'SUCCESS');
        return rows.map((r) => AssessmentPersistenceMapper.toDomain(this.toDocument(r)));
      } catch (error) {
        this.log('findAll', learnerId ?? '*', start, 'FAILURE', error);
        throw error;
      }
    });
  }

  async findByRoadmapId(roadmapId: string): Promise<Assessment[]> {
    return this.instrumented('findByRoadmapId', roadmapId, async () => {
      const start = Date.now();
      try {
        const rows = await this.prisma.assessment.findMany({ where: { roadmapId } });
        this.log('findByRoadmapId', roadmapId, start, 'SUCCESS');
        return rows.map((r) => AssessmentPersistenceMapper.toDomain(this.toDocument(r)));
      } catch (error) {
        this.log('findByRoadmapId', roadmapId, start, 'FAILURE', error);
        throw error;
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.instrumented('delete', id, async () => {
      const start = Date.now();
      try {
        await this.prisma.assessment.deleteMany({ where: { id } });
        this.log('delete', id, start, 'SUCCESS');
      } catch (error) {
        this.log('delete', id, start, 'FAILURE', error);
        throw error;
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDocument(row: any): AssessmentDocument {
    return {
      _id: row.id,
      goalId: row.goalId,
      roadmapId: row.roadmapId,
      learnerId: row.learnerId,
      status: row.status,
      aggregateVersion: row.aggregateVersion,
      latestResult: row.latestResult,
      history: row.history,
      invalidatedAt: row.invalidatedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async instrumented<T>(
    operation: string,
    aggregateId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const start = Date.now();
    const run = async (): Promise<T> => {
      try {
        const result = await fn();
        this.metrics?.recordDbLatency(operation, Date.now() - start);
        return result;
      } catch (error) {
        this.metrics?.recordDbLatency(operation, Date.now() - start);
        throw error;
      }
    };

    if (!this.tracer) {
      return run();
    }
    return this.tracer.withSpan(
      `postgres.${operation}`,
      SpanFactory.attributesFor({ operation, aggregateId }),
      run,
    );
  }

  private log(
    operation: string,
    aggregateId: string,
    startMs: number,
    status: string,
    error?: unknown,
  ): void {
    console.log(
      JSON.stringify({
        traceId: 'db',
        operation,
        aggregateId,
        latencyMs: Date.now() - startMs,
        database: 'postgresql',
        status,
        errorType: error instanceof Error ? error.constructor.name : undefined,
      }),
    );
  }
}
