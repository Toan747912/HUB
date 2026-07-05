import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../../infrastructure/persistence/prisma.service';
import { LearningSession } from '../../../domain/aggregates/learning-session.aggregate';
import { ILearningSessionRepository } from '../../../application/contracts/learning-session-repository.contract';
import { MetricsService } from '../../../../../infrastructure/observability/metrics.service';
import { SpanFactory } from '../../../../../infrastructure/observability/span.factory';
import { TracerService } from '../../../../../infrastructure/observability/tracer.service';
import {
  LearningSessionDocument,
  LearningSessionPersistenceMapper,
} from '../mappers/learning-session-persistence.mapper';

@Injectable()
export class PrismaLearningSessionRepository implements ILearningSessionRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tracer?: TracerService,
    private readonly metrics?: MetricsService,
  ) {}

  async save(session: LearningSession): Promise<void> {
    await this.instrumented('save', session.getId().toString(), async () => {
      const start = Date.now();
      const doc = LearningSessionPersistenceMapper.toDocument(session);
      const { _id, createdAt, ...mutableFields } = doc;
      const jsonFields = {
        activities: mutableFields.activities as unknown as Prisma.InputJsonValue,
        tasks: mutableFields.tasks as unknown as Prisma.InputJsonValue,
        evidence: mutableFields.evidence as unknown as Prisma.InputJsonValue,
        progress: mutableFields.progress as unknown as Prisma.InputJsonValue,
        timers: mutableFields.timers as unknown as Prisma.InputJsonValue,
        history: mutableFields.history as unknown as Prisma.InputJsonValue,
        reflection: (mutableFields.reflection ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        notes: (mutableFields.notes ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      };
      try {
        await this.prisma.learningSession.upsert({
          where: { id: _id },
          update: {
            goalId: mutableFields.goalId,
            roadmapId: mutableFields.roadmapId,
            assessmentId: mutableFields.assessmentId ?? null,
            learnerId: mutableFields.learnerId,
            status: mutableFields.status,
            aggregateVersion: mutableFields.aggregateVersion,
            ...jsonFields,
            updatedAt: new Date(),
          },
          create: {
            id: _id,
            goalId: mutableFields.goalId,
            roadmapId: mutableFields.roadmapId,
            assessmentId: mutableFields.assessmentId ?? null,
            learnerId: mutableFields.learnerId,
            status: mutableFields.status,
            aggregateVersion: mutableFields.aggregateVersion,
            ...jsonFields,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        this.log('save', session.getId().toString(), start, 'SUCCESS');
      } catch (error) {
        this.log('save', session.getId().toString(), start, 'FAILURE', error);
        throw error;
      }
    });
  }

  async findById(id: string): Promise<LearningSession | null> {
    return this.instrumented('findById', id, async () => {
      const start = Date.now();
      try {
        const row = await this.prisma.learningSession.findUnique({ where: { id } });
        this.log('findById', id, start, 'SUCCESS');
        return row ? LearningSessionPersistenceMapper.toDomain(this.toDocument(row)) : null;
      } catch (error) {
        this.log('findById', id, start, 'FAILURE', error);
        throw error;
      }
    });
  }

  async findAll(): Promise<LearningSession[]> {
    return this.instrumented('findAll', '*', async () => {
      const start = Date.now();
      try {
        const rows = await this.prisma.learningSession.findMany();
        this.log('findAll', '*', start, 'SUCCESS');
        return rows.map((r) => LearningSessionPersistenceMapper.toDomain(this.toDocument(r)));
      } catch (error) {
        this.log('findAll', '*', start, 'FAILURE', error);
        throw error;
      }
    });
  }

  async findByLearnerId(learnerId: string): Promise<LearningSession[]> {
    return this.instrumented('findByLearnerId', learnerId, async () => {
      const start = Date.now();
      try {
        const rows = await this.prisma.learningSession.findMany({ where: { learnerId } });
        this.log('findByLearnerId', learnerId, start, 'SUCCESS');
        return rows.map((r) => LearningSessionPersistenceMapper.toDomain(this.toDocument(r)));
      } catch (error) {
        this.log('findByLearnerId', learnerId, start, 'FAILURE', error);
        throw error;
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.instrumented('delete', id, async () => {
      const start = Date.now();
      try {
        await this.prisma.learningSession.deleteMany({ where: { id } });
        this.log('delete', id, start, 'SUCCESS');
      } catch (error) {
        this.log('delete', id, start, 'FAILURE', error);
        throw error;
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDocument(row: any): LearningSessionDocument {
    return {
      _id: row.id,
      goalId: row.goalId,
      roadmapId: row.roadmapId,
      assessmentId: row.assessmentId,
      learnerId: row.learnerId,
      status: row.status,
      aggregateVersion: row.aggregateVersion,
      activities: row.activities,
      tasks: row.tasks,
      evidence: row.evidence,
      progress: row.progress,
      timers: row.timers,
      history: row.history,
      reflection: row.reflection,
      notes: row.notes,
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
