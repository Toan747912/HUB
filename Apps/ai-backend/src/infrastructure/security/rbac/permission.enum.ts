// Future-ready: adding a new permission is a one-line addition here plus one entry
// per role in role-permissions.map.ts — no guard/decorator code changes needed.
export const PERMISSIONS = [
  'Goal.Read',
  'Goal.Write',
  'Goal.Delete',
  'Goal.Complete',
  'Goal.Archive',
  'Roadmap.Read',
  'Roadmap.Write',
  'Roadmap.Publish',
  'Roadmap.Archive',
  'Roadmap.Regenerate',
  'Assessment.Read',
  'Assessment.Write',
  'Assessment.Run',
  'Assessment.Approve',
  'Assessment.Archive',
  'Recommendation.Read',
  'Recommendation.Generate',
  'Recommendation.Approve',
  'Recommendation.Reject',
  'Recommendation.Archive',
  'LearningSession.Read',
  'LearningSession.Write',
  'LearningSession.Start',
  'LearningSession.Complete',
  'LearningSession.Cancel',
  'LearningSession.Analytics',
] as const;

export type Permission = (typeof PERMISSIONS)[number];
