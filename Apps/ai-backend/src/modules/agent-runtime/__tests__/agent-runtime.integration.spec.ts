import { Test, TestingModule } from '@nestjs/testing';
import { AgentRuntimeModule } from '../agent-runtime.module';
import { AgentRuntimeService } from '../application/agent-runtime.service';
import { AgentRegistryService } from '../application/agent-registry.service';
import { WorkflowRegistryService } from '../application/workflow-registry.service';
import { VerificationPipelineService } from '../../agent-core/infrastructure/verification-pipeline.service';
import { IAgentRequest } from '../../agent-core/domain/interfaces';

describe('Agent Runtime — full integration', () => {
  let module: TestingModule;
  let runtime: AgentRuntimeService;
  let agentRegistry: AgentRegistryService;
  let workflowRegistry: WorkflowRegistryService;
  let verificationPipeline: VerificationPipelineService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AgentRuntimeModule],
    }).compile();

    runtime = module.get(AgentRuntimeService);
    agentRegistry = module.get(AgentRegistryService);
    workflowRegistry = module.get(WorkflowRegistryService);
    verificationPipeline = module.get(VerificationPipelineService);
  });

  afterAll(async () => {
    await module.close();
  });

  function buildRequest(agentId: string): IAgentRequest {
    return {
      requestId: 'req-integration-1',
      agentId,
      goal: 'produce a mission plan',
      input: {},
      context: {
        traceId: 'trace-integration-1',
        userId: 'user-1',
        sessionId: 'session-1',
        metadata: {},
      },
    };
  }

  it('loads the agent, resolves the workflow, and runs a real mission-planner step end to end', async () => {
    agentRegistry.register({ id: 'mission-agent', name: 'Mission Agent', workflowId: 'mission-workflow' });
    workflowRegistry.register({
      workflowId: 'mission-workflow',
      name: 'Mission Workflow',
      steps: [
        {
          stepId: 'generate-mission',
          name: 'Generate mission',
          kind: 'planner',
          target: 'mission_planner',
          input: { goalId: 'goal-1' },
        },
        {
          stepId: 'verify-result',
          name: 'Verify result',
          kind: 'verification',
          target: 'default',
        },
      ],
    });

    const result = await runtime.run(buildRequest('mission-agent'));

    expect(result.status).toBe('success');
    expect(result.steps.map((s) => s.status)).toEqual(['completed', 'completed']);
    const missionOutput = result.output['generate-mission'] as Record<string, unknown>;
    expect(typeof missionOutput.confidence).toBe('number');
    expect(missionOutput.confidence as number).toBeGreaterThanOrEqual(0);
  });

  it('returns INVALID_RESULT failure when the verification pipeline rejects the run', async () => {
    agentRegistry.register({ id: 'rejected-agent', name: 'Rejected Agent', workflowId: 'rejected-workflow' });
    workflowRegistry.register({
      workflowId: 'rejected-workflow',
      name: 'Rejected Workflow',
      steps: [{ stepId: 'verify-only', name: 'Verify', kind: 'verification', target: 'default' }],
    });
    verificationPipeline.register({ verify: async () => false });

    const result = await runtime.run(buildRequest('rejected-agent'));

    expect(result.status).toBe('failure');
    expect(result.error).toBe('Verification pipeline rejected the result');
    expect(result.steps[0].status).toBe('failed');
  });
});
