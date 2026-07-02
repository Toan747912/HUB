import { PERMISSIONS } from '../permission.enum';
import { ROLES } from '../role.enum';
import { ROLE_PERMISSIONS, rolesHavePermission } from '../role-permissions.map';

describe('ROLE_PERMISSIONS', () => {
  it('defines an entry for every role', () => {
    for (const role of ROLES) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
    }
  });

  // Evidence: RBAC
  it('ADMIN has all permissions', () => {
    for (const permission of PERMISSIONS) {
      expect(rolesHavePermission(['ADMIN'], permission)).toBe(true);
    }
  });

  it('SYSTEM has all permissions', () => {
    for (const permission of PERMISSIONS) {
      expect(rolesHavePermission(['SYSTEM'], permission)).toBe(true);
    }
  });

  it('TEACHER can read/write/complete/archive but not delete', () => {
    expect(rolesHavePermission(['TEACHER'], 'Goal.Read')).toBe(true);
    expect(rolesHavePermission(['TEACHER'], 'Goal.Write')).toBe(true);
    expect(rolesHavePermission(['TEACHER'], 'Goal.Complete')).toBe(true);
    expect(rolesHavePermission(['TEACHER'], 'Goal.Archive')).toBe(true);
    expect(rolesHavePermission(['TEACHER'], 'Goal.Delete')).toBe(false);
  });

  it('STUDENT can only read and complete', () => {
    expect(rolesHavePermission(['STUDENT'], 'Goal.Read')).toBe(true);
    expect(rolesHavePermission(['STUDENT'], 'Goal.Complete')).toBe(true);
    expect(rolesHavePermission(['STUDENT'], 'Goal.Write')).toBe(false);
    expect(rolesHavePermission(['STUDENT'], 'Goal.Archive')).toBe(false);
    expect(rolesHavePermission(['STUDENT'], 'Goal.Delete')).toBe(false);
  });

  it('a user with multiple roles gets the union of permissions', () => {
    expect(rolesHavePermission(['STUDENT', 'TEACHER'], 'Goal.Archive')).toBe(true);
  });

  it('an empty role list has no permissions', () => {
    for (const permission of PERMISSIONS) {
      expect(rolesHavePermission([], permission)).toBe(false);
    }
  });

  it('TEACHER can read/write/publish/archive/regenerate roadmaps', () => {
    expect(rolesHavePermission(['TEACHER'], 'Roadmap.Read')).toBe(true);
    expect(rolesHavePermission(['TEACHER'], 'Roadmap.Write')).toBe(true);
    expect(rolesHavePermission(['TEACHER'], 'Roadmap.Publish')).toBe(true);
    expect(rolesHavePermission(['TEACHER'], 'Roadmap.Archive')).toBe(true);
    expect(rolesHavePermission(['TEACHER'], 'Roadmap.Regenerate')).toBe(true);
  });

  it('STUDENT can only read roadmaps', () => {
    expect(rolesHavePermission(['STUDENT'], 'Roadmap.Read')).toBe(true);
    expect(rolesHavePermission(['STUDENT'], 'Roadmap.Write')).toBe(false);
    expect(rolesHavePermission(['STUDENT'], 'Roadmap.Publish')).toBe(false);
    expect(rolesHavePermission(['STUDENT'], 'Roadmap.Archive')).toBe(false);
    expect(rolesHavePermission(['STUDENT'], 'Roadmap.Regenerate')).toBe(false);
  });

  it('TEACHER can read/write/run/approve/archive assessments', () => {
    expect(rolesHavePermission(['TEACHER'], 'Assessment.Read')).toBe(true);
    expect(rolesHavePermission(['TEACHER'], 'Assessment.Write')).toBe(true);
    expect(rolesHavePermission(['TEACHER'], 'Assessment.Run')).toBe(true);
    expect(rolesHavePermission(['TEACHER'], 'Assessment.Approve')).toBe(true);
    expect(rolesHavePermission(['TEACHER'], 'Assessment.Archive')).toBe(true);
  });

  it('STUDENT can read and run their own assessment but not write/approve/archive', () => {
    expect(rolesHavePermission(['STUDENT'], 'Assessment.Read')).toBe(true);
    expect(rolesHavePermission(['STUDENT'], 'Assessment.Run')).toBe(true);
    expect(rolesHavePermission(['STUDENT'], 'Assessment.Write')).toBe(false);
    expect(rolesHavePermission(['STUDENT'], 'Assessment.Approve')).toBe(false);
    expect(rolesHavePermission(['STUDENT'], 'Assessment.Archive')).toBe(false);
  });

  it('TEACHER can read/generate/approve/reject/archive recommendations', () => {
    expect(rolesHavePermission(['TEACHER'], 'Recommendation.Read')).toBe(true);
    expect(rolesHavePermission(['TEACHER'], 'Recommendation.Generate')).toBe(true);
    expect(rolesHavePermission(['TEACHER'], 'Recommendation.Approve')).toBe(true);
    expect(rolesHavePermission(['TEACHER'], 'Recommendation.Reject')).toBe(true);
    expect(rolesHavePermission(['TEACHER'], 'Recommendation.Archive')).toBe(true);
  });

  it('STUDENT can read/approve/reject recommendations but not generate/archive', () => {
    expect(rolesHavePermission(['STUDENT'], 'Recommendation.Read')).toBe(true);
    expect(rolesHavePermission(['STUDENT'], 'Recommendation.Approve')).toBe(true);
    expect(rolesHavePermission(['STUDENT'], 'Recommendation.Reject')).toBe(true);
    expect(rolesHavePermission(['STUDENT'], 'Recommendation.Generate')).toBe(false);
    expect(rolesHavePermission(['STUDENT'], 'Recommendation.Archive')).toBe(false);
  });
});
