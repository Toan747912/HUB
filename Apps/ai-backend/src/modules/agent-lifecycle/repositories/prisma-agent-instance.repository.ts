import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/persistence/prisma.service';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { ACTIVE_LIFECYCLE_STATES, TERMINAL_LIFECYCLE_STATES } from '../domain/lifecycle-state';
import {
  AgentInstance,
  ILifecycleRepository,
  LifecycleError,
  LifecycleErrorCode,
} from '../domain/lifecycle.types';
import { AgentInstanceDocument } from '../schemas/agent-instance.schema';

@Injectable()
export class PrismaAgentInstanceRepository implements ILifecycleRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics?: MetricsService,
  ) {}

  async create(instance: AgentInstance): Promise<AgentInstance> {
    return this.instrumented('create', async () => {
      const created = await this.prisma.agentInstance.create({
        data: {
          id: instance.instanceId,
          agentId: instance.agentId,
          workflowId: instance.workflowId,
          status: instance.status,
          startedAt: instance.startedAt,
          endedAt: instance.endedAt,
          currentStep: instance.currentStep,
          completedSteps: instance.completedSteps as unknown as Prisma.InputJsonValue,
          failedSteps: instance.failedSteps as unknown as Prisma.InputJsonValue,
          traceId: instance.traceId,
          userId: instance.userId,
          sessionId: instance.sessionId,
          lastError: instance.lastError,
        },
      });
      return this.toDomain(this.toDocument(created));
    });
  }

  async update(instanceId: string, patch: Partial<AgentInstance>): Promise<AgentInstance> {
    return this.instrumented('update', async () => {
      const { instanceId: _ignored, createdAt: _createdAtIgnored, ...fields } = patch as AgentInstance;
      try {
        const updated = await this.prisma.agentInstance.update({
          where: { id: instanceId },
          data: {
            ...fields,
            completedSteps: fields.completedSteps as unknown as Prisma.InputJsonValue | undefined,
            failedSteps: fields.failedSteps as unknown as Prisma.InputJsonValue | undefined,
          },
        });
        return this.toDomain(this.toDocument(updated));
      } catch {
        throw new LifecycleError(
          LifecycleErrorCode.INSTANCE_NOT_FOUND,
          `Agent instance not found: ${instanceId}`,
          instanceId,
        );
      }
    });
  }

  async findById(instanceId: string): Promise<AgentInstance | null> {
    return this.instrumented('findById', async () => {
      const row = await this.prisma.agentInstance.findUnique({ where: { id: instanceId } });
      return row ? this.toDomain(this.toDocument(row)) : null;
    });
  }

  async findActive(): Promise<AgentInstance[]> {
    return this.instrumented('findActive', async () => {
      const rows = await this.prisma.agentInstance.findMany({
        where: { status: { in: [...ACTIVE_LIFECYCLE_STATES] } },
      });
      return rows.map((row) => this.toDomain(this.toDocument(row)));
    });
  }

  async deleteTerminalOlderThan(cutoff: Date): Promise<number> {
    return this.instrumented('deleteTerminalOlderThan', async () => {
      const result = await this.prisma.agentInstance.deleteMany({
        where: {
          status: { in: Array.from(TERMINAL_LIFECYCLE_STATES) },
          updatedAt: { lt: cutoff },
        },
      });
      return result.count;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDocument(row: any): AgentInstanceDocument {
    return {
      _id: row.id,
      agentId: row.agentId,
      workflowId: row.workflowId,
      status: row.status,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      currentStep: row.currentStep,
      completedSteps: row.completedSteps,
      failedSteps: row.failedSteps,
      traceId: row.traceId,
      userId: row.userId,
      sessionId: row.sessionId,
      lastError: row.lastError,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toDomain(doc: AgentInstanceDocument): AgentInstance {
    return {
      instanceId: doc._id,
      agentId: doc.agentId,
      workflowId: doc.workflowId,
      status: doc.status,
      startedAt: doc.startedAt ?? null,
      endedAt: doc.endedAt ?? null,
      currentStep: doc.currentStep ?? null,
      completedSteps: doc.completedSteps ?? [],
      failedSteps: doc.failedSteps ?? [],
      traceId: doc.traceId,
      userId: doc.userId ?? null,
      sessionId: doc.sessionId ?? null,
      lastError: doc.lastError ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private async instrumented<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      return await fn();
    } finally {
      this.metrics?.recordDbLatency(`agent_lifecycle.${operation}`, Date.now() - start);
    }
  }
}
