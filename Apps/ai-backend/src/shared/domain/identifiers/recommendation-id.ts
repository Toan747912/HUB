import { randomUUID } from 'node:crypto';
import { Identifier } from './identifier.base';

export class RecommendationId extends Identifier<'Recommendation'> {
  public static create(value: string): RecommendationId {
    return new RecommendationId(value);
  }

  public static generate(): RecommendationId {
    return new RecommendationId(randomUUID());
  }
}
