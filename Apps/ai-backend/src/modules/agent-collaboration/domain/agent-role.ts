/**
 * A semantic role an agent can be addressed by within a collaboration
 * session, instead of a fixed agentId. Kept as `string` (not a closed union)
 * because the work package requires future roles to register dynamically at
 * runtime through RoleResolverService - BUILT_IN_COLLABORATION_ROLES is only
 * the starter catalogue, not an exhaustive type.
 */
export type SemanticRole = string;

export const BUILT_IN_COLLABORATION_ROLES = [
  'Planner',
  'Researcher',
  'Retriever',
  'Analyst',
  'Critic',
  'Reviewer',
  'Verifier',
  'Summarizer',
  'Teacher',
  'Coder',
  'Tester',
  'Observer',
] as const;

export type BuiltInCollaborationRole = (typeof BUILT_IN_COLLABORATION_ROLES)[number];
