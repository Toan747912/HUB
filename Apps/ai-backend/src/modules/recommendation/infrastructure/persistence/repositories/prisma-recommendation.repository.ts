import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../../infrastructure/persistence/prisma.service';
import { PrismaTransactionClient } from '../../../../../infrastructure/persistence/with-transaction';
import { Recommendation } from '../../../domain/aggregates/recommendation.aggregate';
import { IRecommendationRepository } from '../../../application/contracts/recommendation-repository.contract';
import { MetricsService } from '../../../../../infrastructure/observability/metrics.service';
import { SpanFactory } from '../../../../../infrastructure/observability/span.factory';
import { TracerService } from '../../../../../infrastructure/observability/tracer.service';
import { RecommendationDocument } from '../documents/recommendation.document';
import { RecommendationPersistenceMapper } from '../mappers/recommendation-persistence.mapper';

@Injectable()
export class PrismaRecommendationRepository implements IRecommendationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tracer?: TracerService,
    private readonly metrics?: MetricsService,
  ) {}

  async save(recommendation: Recommendation, tx?: PrismaTransactionClient): Promise<void> {
    await this.instrumented('save', recommendation.getId().toString(), async () => {
      const start = Date.now();
      const doc = RecommendationPersistenceMapper.toDocument(recommendation);
      const { _id, createdAt, ...mutableFields } = doc;
      const client = tx ?? this.prisma;
      const jsonFields = {
        items: mutableFields.items as unknown as Prisma.InputJsonValue,
        learningStrategies: mutableFields.learningStrategies as unknown as Prisma.InputJsonValue,
        reviewSchedules: mutableFields.reviewSchedules as unknown as Prisma.InputJsonValue,
        priorityDecisions: mutableFields.priorityDecisions as unknown as Prisma.InputJsonValue,
        history: mutableFields.history as unknown as Prisma.InputJsonValue,
      };
      try {
        await client.recommendation.upsert({
          where: { id: _id },
          update: {
            goalId: mutableFields.goalId,
            roadmapId: mutableFields.roadmapId,
            assessmentId: mutableFields.assessmentId,
            learnerId: mutableFields.learnerId,
            status: mutableFields.status,
            aggregateVersion: mutableFields.aggregateVersion,
            engineVersion: mutableFields.engineVersion,
            invalidatedAt: mutableFields.invalidatedAt,
            ...jsonFields,
            updatedAt: new Date(),
          },
          create: {
            id: _id,
            goalId: mutableFields.goalId,
            roadmapId: mutableFields.roadmapId,
            assessmentId: mutableFields.assessmentId,
            learnerId: mutableFields.learnerId,
            status: mutableFields.status,
            aggregateVersion: mutableFields.aggregateVersion,
            engineVersion: mutableFields.engineVersion,
            invalidatedAt: mutableFields.invalidatedAt,
            ...jsonFields,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        this.log('save', recommendation.getId().toString(), start, 'SUCCESS');
      } catch (error) {
        this.log('save', recommendation.getId().toString(), start, 'FAILURE', error);
        throw error;
      }
    });
  }

  async findById(id: string): Promise<Recommendation | null> {
    return this.instrumented('findById', id, async () => {
      const start = Date.now();
      try {
        const row = await this.prisma.recommendation.findUnique({ where: { id } });
        this.log('findById', id, start, 'SUCCESS');
        return row ? RecommendationPersistenceMapper.toDomain(this.toDocument(row)) : null;
      } catch (error) {
        this.log('findById', id, start, 'FAILURE', error);
        throw error;
      }
    });
  }

  async findAll(learnerId?: string): Promise<Recommendation[]> {
    return this.instrumented('findAll', learnerId ?? '*', async () => {
      const start = Date.now();
      try {
        const rows = await this.prisma.recommendation.findMany({
          where: learnerId ? { learnerId } : undefined,
        });
        this.log('findAll', learnerId ?? '*', start, 'SUCCESS');
        return rows.map((r) => RecommendationPersistenceMapper.toDomain(this.toDocument(r)));
      } catch (error) {
        this.log('findAll', learnerId ?? '*', start, 'FAILURE', error);
        throw error;
      }
    });
  }

  async findByAssessmentId(assessmentId: string): Promise<Recommendation[]> {
    return this.instrumented('findByAssessmentId', assessmentId, async () => {
      const start = Date.now();
      try {
        const rows = await this.prisma.recommendation.findMany({ where: { assessmentId } });
        this.log('findByAssessmentId', assessmentId, start, 'SUCCESS');
        return rows.map((r) => RecommendationPersistenceMapper.toDomain(this.toDocument(r)));
      } catch (error) {
        this.log('findByAssessmentId', assessmentId, start, 'FAILURE', error);
        throw error;
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.instrumented('delete', id, async () => {
      const start = Date.now();
      try {
        await this.prisma.recommendation.deleteMany({ where: { id } });
        this.log('delete', id, start, 'SUCCESS');
      } catch (error) {
        this.log('delete', id, start, 'FAILURE', error);
        throw error;
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDocument(row: any): RecommendationDocument {
    return {
      _id: row.id,
      goalId: row.goalId,
      roadmapId: row.roadmapId,
      assessmentId: row.assessmentId,
      learnerId: row.learnerId,
      status: row.status,
      aggregateVersion: row.aggregateVersion,
      engineVersion: row.engineVersion,
      items: row.items,
      learningStrategies: row.learningStrategies,
      reviewSchedules: row.reviewSchedules,
      priorityDecisions: row.priorityDecisions,
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
