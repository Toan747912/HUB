import { Injectable } from '@nestjs/common';

@Injectable()
export class RoadmapService {
  async getRoadmapSlice(goalId: string): Promise<{ nodeId: string; status: string }> {
    return { nodeId: `roadmap-node-${goalId}`, status: 'ACTIVE' };
  }
}
