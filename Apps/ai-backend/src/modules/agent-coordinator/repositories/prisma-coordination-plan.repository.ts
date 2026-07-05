import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/persistence/prisma.service';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { CoordinationPlan, ICoordinationPlanRepository } from '../domain/coordination-plan';
import { CoordinationPlanDocument } from '../schemas/coordination-plan.schema';

@Injectable()
export class PrismaCoordinationPlanRepository implements ICoordinationPlanRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics?: MetricsService,
  ) {}

  async create(plan: CoordinationPlan): Promise<CoordinationPlan> {
    return this.instrumented('create', async () => {
      // Idempotent: register() may be called more than once for the same
      // planId (e.g. a retried coordination) - upsert rather than fail.
      await this.prisma.coordinationPlan.upsert({
        where: { id: plan.planId },
        update: {},
        create: {
          id: plan.planId,
          agents: plan.agents as unknown as Prisma.InputJsonValue,
          executionOrder: plan.executionOrder as unknown as Prisma.InputJsonValue,
          sharedMemoryScopes: plan.sharedMemoryScopes as unknown as Prisma.InputJsonValue,
          executionPolicy: plan.executionPolicy,
          dependencies: plan.dependencies as unknown as Prisma.InputJsonValue,
          expectedOutputs: plan.expectedOutputs as unknown as Prisma.InputJsonValue,
        },
      });
      return plan;
    });
  }

  async findById(planId: string): Promise<CoordinationPlan | null> {
    return this.instrumented('findById', async () => {
      const row = await this.prisma.coordinationPlan.findUnique({ where: { id: planId } });
      return row ? this.toDomain(this.toDocument(row)) : null;
    });
  }

  async findRecent(limit: number): Promise<CoordinationPlan[]> {
    return this.instrumented('findRecent', async () => {
      const rows = await this.prisma.coordinationPlan.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return rows.map((row) => this.toDomain(this.toDocument(row)));
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDocument(row: any): CoordinationPlanDocument {
    return {
      _id: row.id,
      agents: row.agents,
      executionOrder: row.executionOrder,
      sharedMemoryScopes: row.sharedMemoryScopes,
      executionPolicy: row.executionPolicy,
      dependencies: row.dependencies,
      expectedOutputs: row.expectedOutputs,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toDomain(doc: CoordinationPlanDocument): CoordinationPlan {
    return {
      planId: doc._id,
      agents: doc.agents as unknown as CoordinationPlan['agents'],
      executionOrder: doc.executionOrder as unknown as CoordinationPlan['executionOrder'],
      sharedMemoryScopes: doc.sharedMemoryScopes as unknown as CoordinationPlan['sharedMemoryScopes'],
      executionPolicy: doc.executionPolicy as CoordinationPlan['executionPolicy'],
      dependencies: doc.dependencies,
      expectedOutputs: doc.expectedOutputs,
    };
  }

  private async instrumented<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      return await fn();
    } finally {
      this.metrics?.recordDbLatency(`agent_coordinator.${operation}`, Date.now() - start);
    }
  }
}
