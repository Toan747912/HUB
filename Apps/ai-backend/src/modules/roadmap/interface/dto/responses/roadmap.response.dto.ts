export class RoadmapTaskResponseDto {
  id!: string;
  title!: string;
  order!: number;
  dependsOn!: string[];
  estimatedDurationDays!: number;
  complexity!: string;
  skillId!: string;
  completed!: boolean;
}

export class RoadmapMilestoneResponseDto {
  id!: string;
  title!: string;
  order!: number;
  reached!: boolean;
  tasks!: RoadmapTaskResponseDto[];
}

export class RoadmapPhaseResponseDto {
  id!: string;
  title!: string;
  order!: number;
  milestones!: RoadmapMilestoneResponseDto[];
}

export class RoadmapRevisionResponseDto {
  version!: number;
  reason!: string;
  plannerVersion!: string;
  phaseCount!: number;
  milestoneCount!: number;
  taskCount!: number;
  estimatedDurationDays!: number;
  complexity!: string;
  createdAt!: string;
}

export class RoadmapResponseDto {
  roadmapId!: string;
  goalId!: string;
  learnerId!: string;
  status!: string;
  version!: number;
  phases!: RoadmapPhaseResponseDto[];
  estimatedDurationDays!: number;
  complexity!: string;
  plannerVersion!: string;
  progress!: { completionRatio: number; completedTaskIds: string[] };
}

export class RoadmapListResponseDto {
  items!: RoadmapResponseDto[];
  total!: number;
}

export class RoadmapProgressResponseDto {
  roadmapId!: string;
  status!: string;
  completionRatio!: number;
  completedTaskIds!: string[];
}

export class RoadmapHistoryResponseDto {
  roadmapId!: string;
  revisions!: RoadmapRevisionResponseDto[];
}
