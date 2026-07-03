import { Schema } from 'mongoose';

const GoalMilestoneSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    reached: { type: Boolean, required: true, default: false },
    reachedAt: { type: Date, required: false },
  },
  { _id: false },
);

const GoalConstraintSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    value: { type: String, required: true },
    active: { type: Boolean, required: true, default: true },
    createdAt: { type: Date, required: true },
  },
  { _id: false },
);

const GoalVersionSchema = new Schema(
  {
    version: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, required: true },
    difficulty: { type: String, required: true },
    priority: { type: String, required: true },
    targetDate: { type: Date, required: true },
    createdAt: { type: Date, required: true },
  },
  { _id: false },
);

const GoalProgressSchema = new Schema(
  {
    completionRatio: { type: Number, required: true, default: 0 },
    reachedMilestoneIds: { type: [String], required: true, default: [] },
    updatedAt: { type: Date, required: true },
  },
  { _id: false },
);

export const GoalSchema = new Schema(
  {
    _id: { type: String },
    learnerId: { type: String, required: true, index: true },
    status: { type: String, required: true },
    aggregateVersion: { type: Number, required: true, default: 0 },
    versions: { type: [GoalVersionSchema], required: true, default: [] },
    constraints: { type: [GoalConstraintSchema], required: true, default: [] },
    milestones: { type: [GoalMilestoneSchema], required: true, default: [] },
    progress: { type: GoalProgressSchema, required: true },
  },
  {
    _id: false,
    timestamps: true,
    collection: 'goals',
  },
);

GoalSchema.index({ learnerId: 1, status: 1 });
