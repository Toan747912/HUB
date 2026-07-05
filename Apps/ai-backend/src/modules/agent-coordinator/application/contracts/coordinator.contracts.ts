import { IAgentContext } from '../../../agent-core/domain/interfaces';
import { CoordinationPlanInput } from '../../domain/coordination-plan';
import { AggregationStrategy } from '../../domain/coordination.types';

export interface CoordinationRequest {
  plan: CoordinationPlanInput;
  context: IAgentContext;
  aggregation: AggregationStrategy;
}
