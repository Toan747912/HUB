import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../../infrastructure/persistence/prisma.service';
import { PrismaTransactionClient } from '../../../../../infrastructure/persistence/with-transaction';
import { Roadmap } from '../../../domain/aggregates/roadmap.aggregate';
import { IRoadmapRepository } from '../../../application/contracts/roadmap-repository.contract';
import { MetricsService } from '../../../../../infrastructure/observability/metrics.service';
import { SpanFactory } from '../../../../../infrastructure/observability/span.factory';
import { TracerService } from '../../../../../infrastructure/observability/tracer.service';
import { RoadmapDocument } from '../documents/roadmap.document';
import { RoadmapPersistenceMapper } from '../mappers/roadmap-persistence.mapper';

@Injectable()
export class PrismaRoadmapRepository implements IRoadmapRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tracer?: TracerService,
    private readonly metrics?: MetricsService,
  ) {}

  async save(roadmap: Roadmap, tx?: PrismaTransactionClient): Promise<void> {
    await this.instrumented('save', roadmap.getId().toString(), async () => {
      const start = Date.now();
      const doc = RoadmapPersistenceMapper.toDocument(roadmap);
      const { _id, createdAt, ...mutableFields } = doc;
      const client = tx ?? this.prisma;
      const jsonFields = {
        phases: mutableFields.phases as unknown as Prisma.InputJsonValue,
        revisions: mutableFields.revisions as unknown as Prisma.InputJsonValue,
        progress: mutableFields.progress as unknown as Prisma.InputJsonValue,
        goalSnapshot: mutableFields.goalSnapshot as unknown as Prisma.InputJsonValue,
      };
      try {
        await client.roadmap.upsert({
          where: { id: _id },
          update: {
            goalId: mutableFields.goalId,
            learnerId: mutableFields.learnerId,
            status: mutableFields.status,
            aggregateVersion: mutableFields.aggregateVersion,
            estimatedDurationDays: mutableFields.estimatedDurationDays,
            complexity: mutableFields.complexity,
            plannerVersion: mutableFields.plannerVersion,
            invalidatedAt: mutableFields.invalidatedAt,
            ...jsonFields,
            updatedAt: new Date(),
          },
          create: {
            id: _id,
            goalId: mutableFields.goalId,
            learnerId: mutableFields.learnerId,
            status: mutableFields.status,
            aggregateVersion: mutableFields.aggregateVersion,
            estimatedDurationDays: mutableFields.estimatedDurationDays,
            complexity: mutableFields.complexity,
            plannerVersion: mutableFields.plannerVersion,
            invalidatedAt: mutableFields.invalidatedAt,
            ...jsonFields,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        this.log('save', roadmap.getId().toString(), start, 'SUCCESS');
      } catch (error) {
        this.log('save', roadmap.getId().toString(), start, 'FAILURE', error);
        throw error;
      }
    });
  }

  async findById(id: string): Promise<Roadmap | null> {
    return this.instrumented('findById', id, async () => {
      const start = Date.now();
      try {
        const row = await this.prisma.roadmap.findUnique({ where: { id } });
        this.log('findById', id, start, 'SUCCESS');
        return row ? RoadmapPersistenceMapper.toDomain(this.toDocument(row)) : null;
      } catch (error) {
        this.log('findById', id, start, 'FAILURE', error);
        throw error;
      }
    });
  }

  async findAll(learnerId?: string): Promise<Roadmap[]> {
    return this.instrumented('findAll', learnerId ?? '*', async () => {
      const start = Date.now();
      try {
        const rows = await this.prisma.roadmap.findMany({
          where: learnerId ? { learnerId } : undefined,
        });
        this.log('findAll', learnerId ?? '*', start, 'SUCCESS');
        return rows.map((r) => RoadmapPersistenceMapper.toDomain(this.toDocument(r)));
      } catch (error) {
        this.log('findAll', learnerId ?? '*', start, 'FAILURE', error);
        throw error;
      }
    });
  }

  async findByGoalId(goalId: string): Promise<Roadmap[]> {
    return this.instrumented('findByGoalId', goalId, async () => {
      const start = Date.now();
      try {
        const rows = await this.prisma.roadmap.findMany({ where: { goalId } });
        this.log('findByGoalId', goalId, start, 'SUCCESS');
        return rows.map((r) => RoadmapPersistenceMapper.toDomain(this.toDocument(r)));
      } catch (error) {
        this.log('findByGoalId', goalId, start, 'FAILURE', error);
        throw error;
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.instrumented('delete', id, async () => {
      const start = Date.now();
      try {
        await this.prisma.roadmap.deleteMany({ where: { id } });
        this.log('delete', id, start, 'SUCCESS');
      } catch (error) {
        this.log('delete', id, start, 'FAILURE', error);
        throw error;
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDocument(row: any): RoadmapDocument {
    return {
      _id: row.id,
      goalId: row.goalId,
      learnerId: row.learnerId,
      status: row.status,
      aggregateVersion: row.aggregateVersion,
      phases: row.phases,
      revisions: row.revisions,
      progress: row.progress,
      estimatedDurationDays: row.estimatedDurationDays,
      complexity: row.complexity,
      plannerVersion: row.plannerVersion,
      goalSnapshot: row.goalSnapshot,
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
