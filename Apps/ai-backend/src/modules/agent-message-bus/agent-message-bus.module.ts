import { Module } from '@nestjs/common';
import { AuditModule } from '../../infrastructure/audit/audit.module';
import { TelemetryModule } from '../../infrastructure/observability/telemetry.module';
import { AgentRuntimeModule } from '../agent-runtime/agent-runtime.module';
import { AgentRuntimeMessageHandler } from './application/agent-runtime-message-handler.service';
import { MessageBusService } from './application/message-bus.service';
import { MessageDispatcherService } from './application/message-dispatcher.service';
import { MessageRetentionService } from './application/message-retention.service';
import { MessageRouterService } from './application/message-router.service';
import { MessageStoreService } from './application/message-store.service';
import { MESSAGE_REPOSITORY } from './domain/message-types';
import { PrismaMessageRepository } from './repositories/prisma-message.repository';

@Module({
  imports: [AgentRuntimeModule, TelemetryModule, AuditModule],
  providers: [
    { provide: MESSAGE_REPOSITORY, useClass: PrismaMessageRepository },
    MessageStoreService,
    MessageRouterService,
    AgentRuntimeMessageHandler,
    MessageDispatcherService,
    MessageBusService,
    MessageRetentionService,
  ],
  exports: [MessageBusService, MessageRouterService, MessageStoreService],
})
export class AgentMessageBusModule {}
