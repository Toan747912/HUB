import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../../infrastructure/security/jwt-auth.guard';
import { GoalGuard } from '../goal.guard';

describe('GoalGuard', () => {
  it('delegates canActivate to JwtAuthGuard', async () => {
    const jwtAuthGuard = { canActivate: jest.fn().mockResolvedValue(true) };
    const guard = new GoalGuard(jwtAuthGuard as unknown as JwtAuthGuard);
    const context = {} as ExecutionContext;

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(jwtAuthGuard.canActivate).toHaveBeenCalledWith(context);
  });

  it('propagates a rejection from JwtAuthGuard', async () => {
    const jwtAuthGuard = { canActivate: jest.fn().mockRejectedValue(new Error('unauthorized')) };
    const guard = new GoalGuard(jwtAuthGuard as unknown as JwtAuthGuard);

    await expect(guard.canActivate({} as ExecutionContext)).rejects.toThrow('unauthorized');
  });
});
