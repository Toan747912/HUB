import { Injectable } from '@nestjs/common';

@Injectable()
export class KnowledgeService {
  async getKnowledgeSubset(goalId: string): Promise<{ nodeIds: string[] }> {
    return { nodeIds: [`kn-${goalId}-1`, `kn-${goalId}-2`] };
  }
}
