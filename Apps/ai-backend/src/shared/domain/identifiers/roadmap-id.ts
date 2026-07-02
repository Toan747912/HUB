import { randomUUID } from 'node:crypto';
import { Identifier } from './identifier.base';

export class RoadmapId extends Identifier<'Roadmap'> {
  public static create(value: string): RoadmapId {
    return new RoadmapId(value);
  }

  public static generate(): RoadmapId {
    return new RoadmapId(randomUUID());
  }
}
