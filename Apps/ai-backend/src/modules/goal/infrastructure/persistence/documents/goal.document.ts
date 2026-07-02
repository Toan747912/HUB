export interface GoalMilestoneDoc {
  id: string;
  title: string;
  reached: boolean;
  reachedAt?: Date;
}

export interface GoalConstraintDoc {
  id: string;
  type: string;
  value: string;
  active: boolean;
  createdAt: Date;
}

export interface GoalVersionDoc {
  version: number;
  title: string;
  description: string;
  type: string;
  difficulty: string;
  priority: string;
  targetDate: Date;
  createdAt: Date;
}

export interface GoalProgressDoc {
  completionRatio: number;
  reachedMilestoneIds: string[];
  updatedAt: Date;
}

export interface GoalDocument {
  _id: string;
  learnerId: string;
  status: string;
  aggregateVersion: number;
  versions: GoalVersionDoc[];
  constraints: GoalConstraintDoc[];
  milestones: GoalMilestoneDoc[];
  progress: GoalProgressDoc;
  createdAt: Date;
  updatedAt: Date;
}
