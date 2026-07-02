import { Injectable } from '@nestjs/common';

@Injectable()
export class RecommendationService {
  async getRecommendationState(userId: string): Promise<{ state: string }> {
    return { state: `priority-for-${userId}` };
  }
}
