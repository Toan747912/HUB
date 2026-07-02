import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../infrastructure/security/jwt-auth.guard';

/**
 * Delegates to the real JWT/API-key verification in JwtAuthGuard, mirroring
 * GoalGuard/RoadmapGuard/AssessmentGuard so upgrading auth strategies never
 * requires touching controller wiring.
 */
@Injectable()
export class RecommendationGuard implements CanActivate {
  constructor(private readonly jwtAuthGuard: JwtAuthGuard) {}

  canActivate(context: ExecutionContext): Promise<boolean> | boolean {
    return this.jwtAuthGuard.canActivate(context);
  }
}
