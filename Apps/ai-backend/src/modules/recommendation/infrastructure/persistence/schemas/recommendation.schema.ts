import { Schema } from 'mongoose';

const RecommendationScoresSchema = new Schema(
  {
    priorityScore: { type: Number, required: true },
    needScore: { type: Number, required: true },
    urgencyScore: { type: Number, required: true },
    difficultyScore: { type: Number, required: true },
    confidenceScore: { type: Number, required: true },
    riskScore: { type: Number, required: true },
    overallScore: { type: Number, required: true }
  },
  { _id: false }
);

const RecommendationReasonSchema = new Schema(
  {
    summary: { type: String, required: true },
    evidence: { type: [String], required: true, default: [] }
  },
  { _id: false }
);

const RecommendationItemSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    skillArea: { type: String, required: false, default: null },
    taskId: { type: String, required: false, default: null },
    strategy: { type: String, required: false, default: null },
    priority: { type: String, required: true },
    scores: { type: RecommendationScoresSchema, required: true },
    reason: { type: RecommendationReasonSchema, required: true },
    affectedGoalId: { type: String, required: true },
    affectedRoadmapId: { type: String, required: true },
    affectedAssessmentId: { type: String, required: true },
    logicalResourceRef: { type: String, required: false, default: null }
  },
  { _id: false }
);

const LearningStrategyAssignmentSchema = new Schema(
  {
    skillArea: { type: String, required: true },
    strategy: { type: String, required: true },
    rationale: { type: String, required: true }
  },
  { _id: false }
);

const ReviewScheduleSchema = new Schema(
  {
    skillArea: { type: String, required: true },
    intervalDays: { type: Number, required: true },
    dueDate: { type: String, required: true },
    reason: { type: String, required: true }
  },
  { _id: false }
);

const PriorityDecisionSchema = new Schema(
  {
    taskId: { type: String, required: true },
    priorityScore: { type: Number, required: true },
    originalOrder: { type: Number, required: true },
    suggestedOrder: { type: Number, required: true },
    blocked: { type: Boolean, required: true },
    rationale: { type: String, required: true }
  },
  { _id: false }
);

const RecommendationHistorySchema = new Schema(
  {
    version: { type: Number, required: true },
    reason: { type: String, required: true },
    engineVersion: { type: String, required: true },
    itemCount: { type: Number, required: true },
    averageConfidence: { type: Number, required: true },
    createdAt: { type: Date, required: true }
  },
  { _id: false }
);

export const RecommendationSchema = new Schema(
  {
    _id: { type: String },
    goalId: { type: String, required: true },
    roadmapId: { type: String, required: true },
    assessmentId: { type: String, required: true },
    learnerId: { type: String, required: true, index: true },
    status: { type: String, required: true },
    aggregateVersion: { type: Number, required: true, default: 0 },
    engineVersion: { type: String, required: true },
    items: { type: [RecommendationItemSchema], required: true, default: [] },
    learningStrategies: { type: [LearningStrategyAssignmentSchema], required: true, default: [] },
    reviewSchedules: { type: [ReviewScheduleSchema], required: true, default: [] },
    priorityDecisions: { type: [PriorityDecisionSchema], required: true, default: [] },
    history: { type: [RecommendationHistorySchema], required: true, default: [] },
    invalidatedAt: { type: Date, required: false, default: null }
  },
  {
    _id: false,
    timestamps: true,
    collection: 'recommendations'
  }
);

RecommendationSchema.index({ learnerId: 1, status: 1 });
RecommendationSchema.index({ roadmapId: 1 });
