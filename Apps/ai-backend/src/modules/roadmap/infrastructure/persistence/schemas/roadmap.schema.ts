import { Schema } from 'mongoose';

const RoadmapTaskSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    order: { type: Number, required: true },
    dependsOn: { type: [String], required: true, default: [] },
    estimatedDurationDays: { type: Number, required: true },
    complexity: { type: String, required: true },
    skillId: { type: String, required: true },
    completed: { type: Boolean, required: true, default: false },
    completedAt: { type: Date, required: false },
  },
  { _id: false },
);

const RoadmapMilestoneSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    order: { type: Number, required: true },
    tasks: { type: [RoadmapTaskSchema], required: true, default: [] },
    reached: { type: Boolean, required: true, default: false },
    reachedAt: { type: Date, required: false },
  },
  { _id: false },
);

const RoadmapPhaseSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    order: { type: Number, required: true },
    milestones: { type: [RoadmapMilestoneSchema], required: true, default: [] },
  },
  { _id: false },
);

const RoadmapRevisionSchema = new Schema(
  {
    version: { type: Number, required: true },
    reason: { type: String, required: true },
    plannerVersion: { type: String, required: true },
    phaseCount: { type: Number, required: true },
    milestoneCount: { type: Number, required: true },
    taskCount: { type: Number, required: true },
    estimatedDurationDays: { type: Number, required: true },
    complexity: { type: String, required: true },
    createdAt: { type: Date, required: true },
  },
  { _id: false },
);

const RoadmapProgressSchema = new Schema(
  {
    completionRatio: { type: Number, required: true, default: 0 },
    completedTaskIds: { type: [String], required: true, default: [] },
    updatedAt: { type: Date, required: true },
  },
  { _id: false },
);

const RoadmapGoalSnapshotSchema = new Schema(
  {
    goalId: { type: String, required: true },
    learnerId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    goalType: { type: String, required: true },
    difficulty: { type: String, required: true },
    priority: { type: String, required: true },
    constraints: { type: [String], required: true, default: [] },
    targetDate: { type: String, required: true },
  },
  { _id: false },
);

export const RoadmapSchema = new Schema(
  {
    _id: { type: String },
    goalId: { type: String, required: true },
    learnerId: { type: String, required: true, index: true },
    status: { type: String, required: true },
    aggregateVersion: { type: Number, required: true, default: 0 },
    phases: { type: [RoadmapPhaseSchema], required: true, default: [] },
    revisions: { type: [RoadmapRevisionSchema], required: true, default: [] },
    progress: { type: RoadmapProgressSchema, required: true },
    estimatedDurationDays: { type: Number, required: true, default: 0 },
    complexity: { type: String, required: true },
    plannerVersion: { type: String, required: true },
    goalSnapshot: { type: RoadmapGoalSnapshotSchema, required: true },
    invalidatedAt: { type: Date, required: false, default: null },
  },
  {
    _id: false,
    timestamps: true,
    collection: 'roadmaps',
  },
);

RoadmapSchema.index({ learnerId: 1, status: 1 });
RoadmapSchema.index({ goalId: 1 });
