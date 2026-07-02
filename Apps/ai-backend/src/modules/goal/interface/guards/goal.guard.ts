import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../infrastructure/security/jwt-auth.guard';

/**
 * Delegates to the real JWT/API-key verification in JwtAuthGuard. Kept as its own
 * class (same name, same @UseGuards(GoalGuard) usage in the controller) so upgrading
 * from "any non-empty Authorization header" to real auth required zero changes to
 * goal.controller.ts's guard wiring.
 */
@Injectable()
export class GoalGuard implements CanActivate {
  constructor(private readonly jwtAuthGuard: JwtAuthGuard) {}

  canActivate(context: ExecutionContext): Promise<boolean> | boolean {
    return this.jwtAuthGuard.canActivate(context);
  }
}
