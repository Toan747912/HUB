import { CoordinationRequest } from '../application/contracts/coordinator.contracts';
import { CoordinationResult } from '../domain/coordination-result';

/**
 * Public surface of the Multi-Agent Coordinator. Never calls planners, tools,
 * memory, or lifecycle directly - it only orchestrates via AgentRuntimeService.
 */
export interface ICoordinator {
  coordinate(request: CoordinationRequest): Promise<CoordinationResult>;
}
