import { Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class DomainBoundaryGuardService {
  enforceNoCrossDomainWrite(routeDomain: string, attemptedWrites: string[]): void {
    const forbidden = attemptedWrites.filter((w) => w !== routeDomain);
    if (forbidden.length > 0) {
      throw new ForbiddenException({
        error: 'DOMAIN_BOUNDARY_VIOLATION',
        message: 'Cross-domain writes are forbidden',
        forbiddenWrites: forbidden,
      });
    }
  }
}
