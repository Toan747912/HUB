import { MilestoneId } from '../../../../shared/domain/identifiers';
import { RoadmapTask } from './roadmap-task.entity';

export class RoadmapMilestone {
  constructor(
    public readonly id: MilestoneId,
    public readonly title: string,
    public readonly order: number,
    public readonly tasks: RoadmapTask[],
    public readonly reached: boolean = false,
    public readonly reachedAt?: Date,
  ) {}

  withTask(task: RoadmapTask): RoadmapMilestone {
    const tasks = this.tasks.map((t) => (t.id.equals(task.id) ? task : t));
    const reached = tasks.every((t) => t.completed);
    return new RoadmapMilestone(
      this.id,
      this.title,
      this.order,
      tasks,
      reached,
      reached ? new Date() : this.reachedAt,
    );
  }
}
