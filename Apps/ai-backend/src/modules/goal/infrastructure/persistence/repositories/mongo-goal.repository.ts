import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Goal } from '../../../domain/aggregates/goal.aggregate';
import { IGoalRepository } from '../../../application/contracts/goal-repository.contract';
import { MetricsService } from '../../../../../infrastructure/observability/metrics.service';
import { SpanFactory } from '../../../../../infrastructure/observability/span.factory';
import { TracerService } from '../../../../../infrastructure/observability/tracer.service';
import { GoalDocument } from '../documents/goal.document';
import { GoalPersistenceMapper } from '../mappers/goal-persistence.mapper';

export class MongoGoalRepository implements IGoalRepository {
  constructor(
    @InjectModel('Goal') private readonly model: Model<GoalDocument>,
    private readonly tracer?: TracerService,
    private readonly metrics?: MetricsService,
  ) {}

  async save(goal: Goal): Promise<void> {
    await this.instrumented('save', goal.getId().toString(), async () => {
      const start = Date.now();
      const doc = GoalPersistenceMapper.toDocument(goal);
      // Exclude _id (immutable) and createdAt (set-on-insert only) from $set.
      const { _id, createdAt, ...mutableFields } = doc;
      try {
        await this.model.findByIdAndUpdate(
          _id,
          {
            $set: { ...mutableFields, updatedAt: new Date() },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true, returnDocument: 'after' },
        );
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
        const doc = await this.model.findById(id).lean<GoalDocument>().exec();
        this.log('findById', id, start, 'SUCCESS');
        return doc ? GoalPersistenceMapper.toDomain(doc) : null;
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
        const docs = await this.model.find().lean<GoalDocument[]>().exec();
        this.log('findAll', '*', start, 'SUCCESS');
        return docs.map((d) => GoalPersistenceMapper.toDomain(d));
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
        await this.model.findByIdAndDelete(id).exec();
        this.log('delete', id, start, 'SUCCESS');
      } catch (error) {
        this.log('delete', id, start, 'FAILURE', error);
        throw error;
      }
    });
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
    return this.tracer.withSpan(
      `mongodb.${operation}`,
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
        database: 'mongodb',
        status,
        errorType: error instanceof Error ? error.constructor.name : undefined,
      }),
    );
  }
}
