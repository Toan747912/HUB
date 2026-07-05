import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/persistence/prisma.service';
import { PrismaTransactionClient, withTransaction } from '../../../infrastructure/persistence/with-transaction';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { ExecutionPattern } from '../domain/execution-pattern';
import { KnowledgeItem } from '../domain/knowledge-item';
import { LearningRecord } from '../domain/learning-record';
import { Recommendation } from '../domain/recommendation';
import {
  ILearningRepository,
  KnowledgeItemQuery,
  RecommendationQuery,
} from '../interfaces/learning.interface';
import { ExecutionPatternDocument } from '../schemas/execution-pattern.schema';
import { KnowledgeItemDocument } from '../schemas/knowledge-item.schema';
import { LearningRecordDocument } from '../schemas/learning-record.schema';
import { RecommendationDocument } from '../schemas/recommendation.schema';

/**
 * Single repository fronting all four agent-learning tables
 * (learning_records, execution_patterns, knowledge_items,
 * agent_learning_recommendations). Follows the agent-message-bus /
 * agent-memory repository convention: services never touch the Prisma client
 * directly, every operation is timed through MetricsService.recordDbLatency.
 */
@Injectable()
export class PrismaLearningRepository implements ILearningRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics?: MetricsService,
  ) {}

  async saveLearningRecord(
    record: LearningRecord,
    tx?: PrismaTransactionClient,
  ): Promise<LearningRecord> {
    return this.instrumented('saveLearningRecord', async () => {
      const client = tx ?? this.prisma;
      const created = await client.learningRecord.create({
        data: {
          id: record.recordId,
          experience: record.experience as unknown as Prisma.InputJsonValue,
          patternIds: [...record.patternIds] as unknown as Prisma.InputJsonValue,
          knowledgeItemIds: [...record.knowledgeItemIds] as unknown as Prisma.InputJsonValue,
          recommendationIds: [...record.recommendationIds] as unknown as Prisma.InputJsonValue,
          feedback: record.feedback as unknown as Prisma.InputJsonValue,
          workflowId: record.experience.workflowId,
        },
      });
      return this.toLearningRecord(this.toLearningRecordDoc(created));
    });
  }

  async listRecentLearningRecords(limit: number): Promise<LearningRecord[]> {
    return this.instrumented('listRecentLearningRecords', async () => {
      const rows = await this.prisma.learningRecord.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return rows.map((row) => this.toLearningRecord(this.toLearningRecordDoc(row)));
    });
  }

  async findLearningRecordsByWorkflow(workflowId: string, limit: number): Promise<LearningRecord[]> {
    return this.instrumented('findLearningRecordsByWorkflow', async () => {
      const rows = await this.prisma.learningRecord.findMany({
        where: { workflowId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return rows.map((row) => this.toLearningRecord(this.toLearningRecordDoc(row)));
    });
  }

  async saveExecutionPatterns(
    patterns: ExecutionPattern[],
    tx?: PrismaTransactionClient,
  ): Promise<ExecutionPattern[]> {
    if (patterns.length === 0) return [];
    return this.instrumented('saveExecutionPatterns', async () => {
      const client = tx ?? this.prisma;
      const created: ExecutionPattern[] = [];
      for (const pattern of patterns) {
        const row = await client.executionPattern.create({
          data: {
            id: pattern.patternId,
            category: pattern.category,
            subject: pattern.subject,
            description: pattern.description,
            confidence: pattern.confidence,
            evidence: pattern.evidence as unknown as Prisma.InputJsonValue,
            detectedAt: new Date(pattern.detectedAt),
          },
        });
        created.push(this.toExecutionPattern(this.toExecutionPatternDoc(row)));
      }
      return created;
    });
  }

  async saveKnowledgeItems(items: KnowledgeItem[], tx?: PrismaTransactionClient): Promise<KnowledgeItem[]> {
    if (items.length === 0) return [];
    return this.instrumented('saveKnowledgeItems', async () => {
      const client = tx ?? this.prisma;
      const created: KnowledgeItem[] = [];
      for (const item of items) {
        const row = await client.knowledgeItem.create({
          data: {
            id: item.id,
            type: item.type,
            subject: item.subject,
            description: item.description,
            confidence: item.confidence,
            evidence: [...item.evidence] as unknown as Prisma.InputJsonValue,
          },
        });
        created.push(this.toKnowledgeItem(this.toKnowledgeItemDoc(row)));
      }
      return created;
    });
  }

  async saveRecommendations(
    recommendations: Recommendation[],
    tx?: PrismaTransactionClient,
  ): Promise<Recommendation[]> {
    if (recommendations.length === 0) return [];
    return this.instrumented('saveRecommendations', async () => {
      const client = tx ?? this.prisma;
      const created: Recommendation[] = [];
      for (const recommendation of recommendations) {
        const row = await client.agentLearningRecommendation.create({
          data: {
            id: recommendation.id,
            category: recommendation.category,
            subject: recommendation.subject,
            description: recommendation.description,
            confidence: recommendation.confidence,
            basedOnKnowledgeItemIds: [
              ...recommendation.basedOnKnowledgeItemIds,
            ] as unknown as Prisma.InputJsonValue,
          },
        });
        created.push(this.toRecommendation(this.toRecommendationDoc(row)));
      }
      return created;
    });
  }

  async persistLearningCycle(
    patterns: ExecutionPattern[],
    knowledgeItems: KnowledgeItem[],
    recommendations: Recommendation[],
    record: LearningRecord,
  ): Promise<LearningRecord> {
    return withTransaction(this.prisma, async (tx) => {
      await this.saveExecutionPatterns(patterns, tx);
      await this.saveKnowledgeItems(knowledgeItems, tx);
      await this.saveRecommendations(recommendations, tx);
      return this.saveLearningRecord(record, tx);
    });
  }

  async findKnowledgeItems(filter: KnowledgeItemQuery): Promise<KnowledgeItem[]> {
    return this.instrumented('findKnowledgeItems', async () => {
      const rows = await this.prisma.knowledgeItem.findMany({
        where: {
          ...(filter.type ? { type: filter.type } : {}),
          ...(typeof filter.minConfidence === 'number'
            ? { confidence: { gte: filter.minConfidence } }
            : {}),
        },
        orderBy: { confidence: 'desc' },
        take: filter.limit ?? 100,
      });
      return rows.map((row) => this.toKnowledgeItem(this.toKnowledgeItemDoc(row)));
    });
  }

  async findRecommendations(filter: RecommendationQuery): Promise<Recommendation[]> {
    return this.instrumented('findRecommendations', async () => {
      const rows = await this.prisma.agentLearningRecommendation.findMany({
        where: {
          ...(filter.category ? { category: filter.category } : {}),
          ...(typeof filter.minConfidence === 'number'
            ? { confidence: { gte: filter.minConfidence } }
            : {}),
        },
        orderBy: { confidence: 'desc' },
        take: filter.limit ?? 100,
      });
      return rows.map((row) => this.toRecommendation(this.toRecommendationDoc(row)));
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toLearningRecordDoc(row: any): LearningRecordDocument {
    return {
      _id: row.id,
      experience: row.experience,
      patternIds: row.patternIds,
      knowledgeItemIds: row.knowledgeItemIds,
      recommendationIds: row.recommendationIds,
      feedback: row.feedback,
      workflowId: row.workflowId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toExecutionPatternDoc(row: any): ExecutionPatternDocument {
    return {
      _id: row.id,
      category: row.category,
      subject: row.subject,
      description: row.description,
      confidence: row.confidence,
      evidence: row.evidence,
      detectedAt: row.detectedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toKnowledgeItemDoc(row: any): KnowledgeItemDocument {
    return {
      _id: row.id,
      type: row.type,
      subject: row.subject,
      description: row.description,
      confidence: row.confidence,
      evidence: row.evidence,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toRecommendationDoc(row: any): RecommendationDocument {
    return {
      _id: row.id,
      category: row.category,
      subject: row.subject,
      description: row.description,
      confidence: row.confidence,
      basedOnKnowledgeItemIds: row.basedOnKnowledgeItemIds,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toLearningRecord(doc: LearningRecordDocument): LearningRecord {
    return {
      recordId: doc._id,
      experience: doc.experience as unknown as LearningRecord['experience'],
      patternIds: doc.patternIds ?? [],
      knowledgeItemIds: doc.knowledgeItemIds ?? [],
      recommendationIds: doc.recommendationIds ?? [],
      feedback: doc.feedback as unknown as LearningRecord['feedback'],
      createdAt: doc.createdAt.getTime(),
    };
  }

  private toExecutionPattern(doc: ExecutionPatternDocument): ExecutionPattern {
    return {
      patternId: doc._id,
      category: doc.category,
      subject: doc.subject,
      description: doc.description,
      confidence: doc.confidence,
      evidence: doc.evidence as unknown as ExecutionPattern['evidence'],
      detectedAt: doc.detectedAt.getTime(),
    };
  }

  private toKnowledgeItem(doc: KnowledgeItemDocument): KnowledgeItem {
    return {
      id: doc._id,
      type: doc.type,
      subject: doc.subject,
      description: doc.description,
      confidence: doc.confidence,
      evidence: doc.evidence ?? [],
      createdAt: doc.createdAt.getTime(),
    };
  }

  private toRecommendation(doc: RecommendationDocument): Recommendation {
    return {
      id: doc._id,
      category: doc.category,
      subject: doc.subject,
      description: doc.description,
      confidence: doc.confidence,
      basedOnKnowledgeItemIds: doc.basedOnKnowledgeItemIds ?? [],
      createdAt: doc.createdAt.getTime(),
    };
  }

  private async instrumented<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      return await fn();
    } finally {
      this.metrics?.recordDbLatency(`agent_learning.${operation}`, Date.now() - start);
    }
  }
}
