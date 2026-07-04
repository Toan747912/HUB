import { Permission, PERMISSIONS } from './permission.enum';
import { Role } from './role.enum';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [...PERMISSIONS],
  TEACHER: [
    'Goal.Read',
    'Goal.Write',
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
  ],
  STUDENT: [
    'Goal.Read',
    'Goal.Complete',
    'Roadmap.Read',
    'Assessment.Read',
    'Assessment.Run',
    'Recommendation.Read',
    'Recommendation.Approve',
    'Recommendation.Reject',
    'LearningSession.Read',
    'LearningSession.Write',
    'LearningSession.Start',
    'LearningSession.Complete',
    'LearningSession.Cancel',
    'LearningSession.Analytics',
  ],
  SYSTEM: [...PERMISSIONS],
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function rolesHavePermission(roles: Role[], permission: Permission): boolean {
  return roles.some((role) => roleHasPermission(role, permission));
}
