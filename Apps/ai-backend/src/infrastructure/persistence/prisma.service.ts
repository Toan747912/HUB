import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getDatabaseUrl } from './database.config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ datasourceUrl: getDatabaseUrl() });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log(
      JSON.stringify({
        event: 'db_connected',
        database: 'postgresql',
        timestamp: new Date().toISOString(),
      }),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log(
      JSON.stringify({
        event: 'db_disconnected',
        database: 'postgresql',
        timestamp: new Date().toISOString(),
      }),
    );
  }
}
