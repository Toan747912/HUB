import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../../infrastructure/persistence/prisma.service';
import { PrismaTransactionClient } from '../../../../../infrastructure/persistence/with-transaction';
import { Goal } from '../../../domain/aggregates/goal.aggregate';
import { IGoalRepository } from '../../../application/contracts/goal-repository.contract';
import { MetricsService } from '../../../../../infrastructure/observability/metrics.service';
import { SpanFactory } from '../../../../../infrastructure/observability/span.factory';
import { TracerService } from '../../../../../infrastructure/observability/tracer.service';
import { GoalDocument } from '../documents/goal.document';
import { GoalPersistenceMapper } from '../mappers/goal-persistence.mapper';

@Injectable()
export class PrismaGoalRepository implements IGoalRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tracer?: TracerService,
    private readonly metrics?: MetricsService,
  ) {}

  async save(goal: Goal, tx?: PrismaTransactionClient): Promise<void> {
    await this.instrumented('save', goal.getId().toString(), async () => {
      const start = Date.now();
      const doc = GoalPersistenceMapper.toDocument(goal);
      const { _id, createdAt, ...mutableFields } = doc;
      const jsonFields = {
        versions: mutableFields.versions as unknown as Prisma.InputJsonValue,
        constraints: mutableFields.constraints as unknown as Prisma.InputJsonValue,
        milestones: mutableFields.milestones as unknown as Prisma.InputJsonValue,
        progress: mutableFields.progress as unknown as Prisma.InputJsonValue,
      };
      const client = tx ?? this.prisma;
      try {
        await client.goal.upsert({
          where: { id: _id },
          update: {
            learnerId: mutableFields.learnerId,
            status: mutableFields.status,
            aggregateVersion: mutableFields.aggregateVersion,
            ...jsonFields,
            updatedAt: new Date(),
          },
          create: {
            id: _id,
            learnerId: mutableFields.learnerId,
            status: mutableFields.status,
            aggregateVersion: mutableFields.aggregateVersion,
            ...jsonFields,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        this.log('save', goal.getId().toString(), start, 'SUCCESS');
      } catch (error) {
        this.log('save', goal.getId().toString(), start, 'FAILURE', error);
        throw error;
      }
    });
  }

  async findById(id: string): Promise<Goal | null> {
    return this.instrumented('findById', id, async () => {
      const start = Date.now();
      try {
        const row = await this.prisma.goal.findUnique({ where: { id } });
        this.log('findById', id, start, 'SUCCESS');
        return row ? GoalPersistenceMapper.toDomain(this.toDocument(row)) : null;
      } catch (error) {
        this.log('findById', id, start, 'FAILURE', error);
        throw error;
      }
    });
  }

  async findAll(): Promise<Goal[]> {
    return this.instrumented('findAll', '*', async () => {
      const start = Date.now();
      try {
        const rows = await this.prisma.goal.findMany();
        this.log('findAll', '*', start, 'SUCCESS');
        return rows.map((r) => GoalPersistenceMapper.toDomain(this.toDocument(r)));
      } catch (error) {
        this.log('findAll', '*', start, 'FAILURE', error);
        throw error;
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.instrumented('delete', id, async () => {
      const start = Date.now();
      try {
        await this.prisma.goal.deleteMany({ where: { id } });
        this.log('delete', id, start, 'SUCCESS');
      } catch (error) {
        this.log('delete', id, start, 'FAILURE', error);
        throw error;
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDocument(row: any): GoalDocument {
    return {
      _id: row.id,
      learnerId: row.learnerId,
      status: row.status,
      aggregateVersion: row.aggregateVersion,
      versions: row.versions,
      constraints: row.constraints,
      milestones: row.milestones,
      progress: row.progress,
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
