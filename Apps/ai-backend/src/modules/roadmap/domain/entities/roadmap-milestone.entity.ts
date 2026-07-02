import { RoadmapTask } from './roadmap-task.entity';

export class RoadmapMilestone {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly order: number,
    public readonly tasks: RoadmapTask[],
    public readonly reached: boolean = false,
    public readonly reachedAt?: Date
  ) {}

  withTask(task: RoadmapTask): RoadmapMilestone {
    const tasks = this.tasks.map((t) => (t.id === task.id ? task : t));
    const reached = tasks.every((t) => t.completed);
    return new RoadmapMilestone(this.id, this.title, this.order, tasks, reached, reached ? new Date() : this.reachedAt);
  }
}
