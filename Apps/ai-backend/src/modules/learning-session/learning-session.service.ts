import { Injectable } from '@nestjs/common';

@Injectable()
export class LearningSessionService {
  async getSession(sessionId: string): Promise<{ id: string; phase: string }> {
    return { id: sessionId, phase: 'ACTIVE' };
  }
}
