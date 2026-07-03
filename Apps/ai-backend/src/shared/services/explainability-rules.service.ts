import { Injectable, BadRequestException } from '@nestjs/common';

export type ExplainablePayload = {
  confidence: number;
  reasoning: string;
  traced_to: string[];
};

@Injectable()
export class ExplainabilityRulesService {
  validate(payload: ExplainablePayload): void {
    if (
      typeof payload.confidence !== 'number' ||
      payload.confidence < 0 ||
      payload.confidence > 1
    ) {
      throw new BadRequestException('confidence missing or out of range [0,1]');
    }
    if (!payload.reasoning || typeof payload.reasoning !== 'string') {
      throw new BadRequestException('reasoning missing');
    }
    if (!Array.isArray(payload.traced_to) || payload.traced_to.length === 0) {
      throw new BadRequestException('traced_to missing');
    }
  }
}
