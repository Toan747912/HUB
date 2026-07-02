import { Injectable } from '@nestjs/common';

@Injectable()
export class GoalService {
  async getGoal(goalId: string): Promise<{ id: string; title: string }> {
    return { id: goalId, title: 'Become production-ready in backend architecture' };
  }
}
