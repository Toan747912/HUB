import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { QueueModule } from '../jobs/queue.module';
import { OutboxEventSchema } from './outbox-event.schema';
import { OutboxPublisherService } from './outbox-publisher.service';
import { OutboxRelayService } from './outbox-relay.service';
import { OutboxRepository } from './outbox.repository';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'OutboxEvent', schema: OutboxEventSchema }]), QueueModule, AuditModule],
  providers: [OutboxRepository, OutboxPublisherService, OutboxRelayService],
  exports: [OutboxRepository, OutboxPublisherService, OutboxRelayService]
})
export class OutboxModule {}
