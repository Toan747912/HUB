import { Module } from '@nestjs/common';
import { TeachingService } from './teaching.service';

@Module({
  providers: [TeachingService],
  exports: [TeachingService]
})
export class TeachingModule {}
