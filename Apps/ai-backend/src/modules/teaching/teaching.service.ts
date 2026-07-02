import { Injectable } from '@nestjs/common';

@Injectable()
export class TeachingService {
  async getTeachingContext(sessionId: string): Promise<{ hints: string[] }> {
    return { hints: [`hint-for-${sessionId}`] };
  }
}
