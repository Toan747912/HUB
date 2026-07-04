import { Schema } from 'mongoose';

const LearningActivitySchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    status: { type: String, required: true },
    startedAt: { type: Date, required: false },
    endedAt: { type: Date, required: false },
    timeSpent: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const SessionTaskSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    completed: { type: Boolean, required: true, default: false },
    completedAt: { type: Date, required: false },
    skillId: { type: String, required: true },
  },
  { _id: false },
);

const EvidenceRecordSchema = new Schema(
  {
    id: { type: String, required: true },
    completedTasks: { type: Number, required: true },
    timeSpent: { type: Number, required: true },
    completionRate: { type: Number, required: true },
    interruptions: { type: Number, required: true },
    revisionCount: { type: Number, required: true },
    focusScore: { type: Number, required: true },
    engagementScore: { type: Number, required: true },
    recordedAt: { type: Date, required: true },
  },
  { _id: false },
);

const SessionProgressSchema = new Schema(
  {
    completedTasksCount: { type: Number, required: true, default: 0 },
    totalTasksCount: { type: Number, required: true, default: 0 },
    completionRate: { type: Number, required: true, default: 0 },
    lastUpdatedAt: { type: Date, required: true },
  },
  { _id: false },
);

const StudyTimerSchema = new Schema(
  {
    id: { type: String, required: true },
    startedAt: { type: Date, required: true },
    pausedAt: { type: Date, required: false },
    elapsedSeconds: { type: Number, required: true, default: 0 },
    interruptions: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const SessionHistorySchema = new Schema(
  {
    status: { type: String, required: true },
    updatedAt: { type: Date, required: true },
    reason: { type: String, required: false },
  },
  { _id: false },
);

const SessionReflectionSchema = new Schema(
  {
    content: { type: String, required: true },
    rating: { type: Number, required: true },
    recordedAt: { type: Date, required: true },
  },
  { _id: false },
);

const SessionNotesSchema = new Schema(
  {
    content: { type: String, required: true },
    updatedAt: { type: Date, required: true },
  },
  { _id: false },
);

export const LearningSessionSchema = new Schema(
  {
    _id: { type: String },
    goalId: { type: String, required: true, index: true },
    roadmapId: { type: String, required: true, index: true },
    assessmentId: { type: String, required: false },
    learnerId: { type: String, required: true, index: true },
    status: { type: String, required: true },
    aggregateVersion: { type: Number, required: true, default: 0 },
    activities: { type: [LearningActivitySchema], required: true, default: [] },
    tasks: { type: [SessionTaskSchema], required: true, default: [] },
    evidence: { type: [EvidenceRecordSchema], required: true, default: [] },
    progress: { type: SessionProgressSchema, required: true },
    timers: { type: [StudyTimerSchema], required: true, default: [] },
    history: { type: [SessionHistorySchema], required: true, default: [] },
    reflection: { type: SessionReflectionSchema, required: false, default: null },
    notes: { type: SessionNotesSchema, required: false, default: null },
  },
  {
    _id: false,
    timestamps: true,
    collection: 'learning_sessions',
  },
);

LearningSessionSchema.index({ learnerId: 1, status: 1 });
