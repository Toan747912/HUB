export interface RoadmapTaskDoc {
  id: string;
  title: string;
  order: number;
  dependsOn: string[];
  estimatedDurationDays: number;
  complexity: string;
  skillId: string;
  completed: boolean;
  completedAt?: Date;
}

export interface RoadmapMilestoneDoc {
  id: string;
  title: string;
  order: number;
  tasks: RoadmapTaskDoc[];
  reached: boolean;
  reachedAt?: Date;
}

export interface RoadmapPhaseDoc {
  id: string;
  title: string;
  order: number;
  milestones: RoadmapMilestoneDoc[];
}

export interface RoadmapRevisionDoc {
  version: number;
  reason: string;
  plannerVersion: string;
  phaseCount: number;
  milestoneCount: number;
  taskCount: number;
  estimatedDurationDays: number;
  complexity: string;
  createdAt: Date;
}

export interface RoadmapProgressDoc {
  completionRatio: number;
  completedTaskIds: string[];
  updatedAt: Date;
}

export interface RoadmapGoalSnapshotDoc {
  goalId: string;
  learnerId: string;
  title: string;
  description: string;
  goalType: string;
  difficulty: string;
  priority: string;
  constraints: string[];
  targetDate: string;
}

export interface RoadmapDocument {
  _id: string;
  goalId: string;
  learnerId: string;
  status: string;
  aggregateVersion: number;
  phases: RoadmapPhaseDoc[];
  revisions: RoadmapRevisionDoc[];
  progress: RoadmapProgressDoc;
  estimatedDurationDays: number;
  complexity: string;
  plannerVersion: string;
  goalSnapshot: RoadmapGoalSnapshotDoc;
  invalidatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
