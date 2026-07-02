import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AiExecuteDto } from './dto/ai-execute.dto';
import { AiRuntimeService } from './ai-runtime.service';

@Controller('ai')
export class AiRuntimeController {
  constructor(private readonly aiRuntimeService: AiRuntimeService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('execute')
  async execute(@Body() dto: AiExecuteDto) {
    return this.aiRuntimeService.execute(dto);
  }
}
