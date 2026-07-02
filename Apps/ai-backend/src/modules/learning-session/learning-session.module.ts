import { Module } from '@nestjs/common';
import { LearningSessionService } from './learning-session.service';

@Module({
  providers: [LearningSessionService],
  exports: [LearningSessionService]
})
export class LearningSessionModule {}
