import { Injectable } from '@nestjs/common';

@Injectable()
export class AssessmentService {
  async getAssessmentHistory(sessionId: string): Promise<{ refs: string[] }> {
    return { refs: [`assessment-${sessionId}-1`] };
  }
}
