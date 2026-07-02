import { Schema } from 'mongoose';

const SkillScoreSchema = new Schema(
  {
    skillId: { type: String, required: true },
    rawScore: { type: Number, required: true },
    taskCount: { type: Number, required: true },
    completedTaskCount: { type: Number, required: true }
  },
  { _id: false }
);

const CompetencySchema = new Schema(
  {
    skillId: { type: String, required: true },
    score: { type: Number, required: true },
    level: { type: String, required: true }
  },
  { _id: false }
);

const KnowledgeGapSchema = new Schema(
  {
    id: { type: String, required: true },
    skillId: { type: String, required: true },
    weight: { type: String, required: true },
    reason: { type: String, required: true }
  },
  { _id: false }
);

const AssessmentResultSchema = new Schema(
  {
    skillScores: { type: [SkillScoreSchema], required: true, default: [] },
    competencies: { type: [CompetencySchema], required: true, default: [] },
    knowledgeGaps: { type: [KnowledgeGapSchema], required: true, default: [] },
    confidenceScore: { type: Number, required: true },
    readiness: { type: String, required: true },
    weakAreas: { type: [String], required: true, default: [] },
    strongAreas: { type: [String], required: true, default: [] },
    engineVersion: { type: String, required: true },
    computedAt: { type: Date, required: true }
  },
  { _id: false }
);

const AssessmentHistorySchema = new Schema(
  {
    version: { type: Number, required: true },
    reason: { type: String, required: true },
    engineVersion: { type: String, required: true },
    confidenceScore: { type: Number, required: true },
    readiness: { type: String, required: true },
    gapCount: { type: Number, required: true },
    createdAt: { type: Date, required: true }
  },
  { _id: false }
);

export const AssessmentSchema = new Schema(
  {
    _id: { type: String },
    goalId: { type: String, required: true },
    roadmapId: { type: String, required: true },
    learnerId: { type: String, required: true, index: true },
    status: { type: String, required: true },
    aggregateVersion: { type: Number, required: true, default: 0 },
    latestResult: { type: AssessmentResultSchema, required: false, default: null },
    history: { type: [AssessmentHistorySchema], required: true, default: [] },
    invalidatedAt: { type: Date, required: false, default: null }
  },
  {
    _id: false,
    timestamps: true,
    collection: 'assessments'
  }
);

AssessmentSchema.index({ learnerId: 1, status: 1 });
AssessmentSchema.index({ roadmapId: 1 });
