import { Injectable } from '@nestjs/common';

@Injectable()
export class DiscoveryService {
  async getDiscoveryContext(userId: string): Promise<{ profile: string }> {
    return { profile: `discovery-context-${userId}` };
  }
}
