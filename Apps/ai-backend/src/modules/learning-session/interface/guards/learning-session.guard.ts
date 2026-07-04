import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from '../../../../infrastructure/security/jwt-auth.guard';

@Injectable()
export class LearningSessionGuard implements CanActivate {
  constructor(private readonly jwtAuthGuard: JwtAuthGuard) {}

  canActivate(context: ExecutionContext): Promise<boolean> | boolean {
    return this.jwtAuthGuard.canActivate(context);
  }
}
