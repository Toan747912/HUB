import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../infrastructure/persistence/prisma.service';

export type DbHealthStatus = 'connected' | 'disconnected' | 'connecting' | 'disconnecting';

const PING_INTERVAL_MS = 10_000;

@Injectable()
export class DatabaseHealthService implements OnModuleInit, OnModuleDestroy {
  private status: DbHealthStatus = 'connecting';
  private pingTimer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    void this.ping();
    this.pingTimer = setInterval(() => void this.ping(), PING_INTERVAL_MS);
    this.pingTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
  }

  isReady(): boolean {
    return this.status === 'connected';
  }

  getStatus(): DbHealthStatus {
    return this.status;
  }

  private async ping(): Promise<void> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.status = 'connected';
    } catch {
      this.status = 'disconnected';
    }
  }
}
