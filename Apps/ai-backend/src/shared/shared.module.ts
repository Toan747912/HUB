import { Module } from '@nestjs/common';
import { DomainBoundaryGuardService } from './services/domain-boundary-guard.service';
import { ExplainabilityRulesService } from './services/explainability-rules.service';

@Module({
  providers: [DomainBoundaryGuardService, ExplainabilityRulesService],
  exports: [DomainBoundaryGuardService, ExplainabilityRulesService]
})
export class SharedModule {}
