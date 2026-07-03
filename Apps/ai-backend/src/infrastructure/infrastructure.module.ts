import { Module } from '@nestjs/common';
import { MockLlmClientService } from './llm/mock-llm-client.service';

@Module({
  providers: [MockLlmClientService],
  exports: [MockLlmClientService],
})
export class InfrastructureModule {}
