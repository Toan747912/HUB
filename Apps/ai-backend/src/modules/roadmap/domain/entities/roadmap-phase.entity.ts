import { PhaseId } from '../../../../shared/domain/identifiers';
import { RoadmapMilestone } from './roadmap-milestone.entity';

export class RoadmapPhase {
  constructor(
    public readonly id: PhaseId,
    public readonly title: string,
    public readonly order: number,
    public readonly milestones: RoadmapMilestone[]
  ) {}

  withMilestone(milestone: RoadmapMilestone): RoadmapPhase {
    const milestones = this.milestones.map((m) => (m.id.equals(milestone.id) ? milestone : m));
    return new RoadmapPhase(this.id, this.title, this.order, milestones);
  }
}
