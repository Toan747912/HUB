import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Assessment } from '../../../domain/aggregates/assessment.aggregate';
import { IAssessmentRepository } from '../../../application/contracts/assessment-repository.contract';
import { MetricsService } from '../../../../../infrastructure/observability/metrics.service';
import { SpanFactory } from '../../../../../infrastructure/observability/span.factory';
import { TracerService } from '../../../../../infrastructure/observability/tracer.service';
import { AssessmentDocument } from '../documents/assessment.document';
import { AssessmentPersistenceMapper } from '../mappers/assessment-persistence.mapper';

export class MongoAssessmentRepository implements IAssessmentRepository {
  constructor(
    @InjectModel('Assessment') private readonly model: Model<AssessmentDocument>,
    private readonly tracer?: TracerService,
    private readonly metrics?: MetricsService
  ) {}

  async save(assessment: Assessment): Promise<void> {
    await this.instrumented('save', assessment.getId().toString(), async () => {
      const start = Date.now();
      const doc = AssessmentPersistenceMapper.toDocument(assessment);
      const { _id, createdAt, ...mutableFields } = doc;
      try {
        await this.model.findByIdAndUpdate(
          _id,
          {
            $set: { ...mutableFields, updatedAt: new Date() },
            $setOnInsert: { createdAt: new Date() }
          },
          { upsert: true, returnDocument: 'after' }
        );
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
        const doc = await this.model.findById(id).lean<AssessmentDocument>().exec();
        this.log('findById', id, start, 'SUCCESS');
        return doc ? AssessmentPersistenceMapper.toDomain(doc) : null;
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
        const filter = learnerId ? { learnerId } : {};
        const docs = await this.model.find(filter).lean<AssessmentDocument[]>().exec();
        this.log('findAll', learnerId ?? '*', start, 'SUCCESS');
        return docs.map((d) => AssessmentPersistenceMapper.toDomain(d));
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
        const docs = await this.model.find({ roadmapId }).lean<AssessmentDocument[]>().exec();
        this.log('findByRoadmapId', roadmapId, start, 'SUCCESS');
        return docs.map((d) => AssessmentPersistenceMapper.toDomain(d));
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
        await this.model.findByIdAndDelete(id).exec();
        this.log('delete', id, start, 'SUCCESS');
      } catch (error) {
        this.log('delete', id, start, 'FAILURE', error);
        throw error;
      }
    });
  }

  private async instrumented<T>(operation: string, aggregateId: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    const run = async (): Promise<T> => {
      try {
        const result = await fn();
        this.metrics?.recordMongoLatency(operation, Date.now() - start);
        return result;
      } catch (error) {
        this.metrics?.recordMongoLatency(operation, Date.now() - start);
        throw error;
      }
    };

    if (!this.tracer) {
      return run();
    }
    return this.tracer.withSpan(`mongodb.${operation}`, SpanFactory.attributesFor({ operation, aggregateId }), run);
  }

  private log(operation: string, aggregateId: string, startMs: number, status: string, error?: unknown): void {
    console.log(
      JSON.stringify({
        traceId: 'db',
        operation,
        aggregateId,
        latencyMs: Date.now() - startMs,
        database: 'mongodb',
        status,
        errorType: error instanceof Error ? error.constructor.name : undefined
      })
    );
  }
}
