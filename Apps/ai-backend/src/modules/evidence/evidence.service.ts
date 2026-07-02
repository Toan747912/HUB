import { Injectable } from '@nestjs/common';

@Injectable()
export class EvidenceService {
  async getEvidenceSignals(sessionId: string): Promise<{ refs: string[] }> {
    return { refs: [`evidence-${sessionId}-1`, `evidence-${sessionId}-2`] };
  }
}
