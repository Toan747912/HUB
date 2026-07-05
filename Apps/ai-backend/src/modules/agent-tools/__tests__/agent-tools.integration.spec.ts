import { Test, TestingModule } from '@nestjs/testing';
import { AgentRegistryService } from '../../agent-runtime/application/agent-registry.service';
import { AgentRuntimeService } from '../../agent-runtime/application/agent-runtime.service';
import { WorkflowRegistryService } from '../../agent-runtime/application/workflow-registry.service';
import { AgentRuntimeModule } from '../../agent-runtime/agent-runtime.module';
import { IAgentRequest } from '../../agent-core/domain/interfaces';
import { AgentToolsModule } from '../agent-tools.module';
import { ToolDiscoveryService } from '../application/tool-discovery.service';
import { ToolRegistryService } from '../application/tool-registration.service';

describe('Agent Tools — full integration through Agent Runtime', () => {
  let module: TestingModule;
  let runtime: AgentRuntimeService;
  let agentRegistry: AgentRegistryService;
  let workflowRegistry: WorkflowRegistryService;
  let toolRegistry: ToolRegistryService;
  let toolDiscovery: ToolDiscoveryService;

  function buildRequest(agentId: string): IAgentRequest {
    return {
      requestId: 'req-tools-integration-1',
      agentId,
      goal: 'run a production tool',
      input: {},
      context: {
        traceId: 'trace-tools-integration-1',
        userId: 'user-1',
        sessionId: 'session-1',
        metadata: {},
      },
    };
  }

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AgentToolsModule, AgentRuntimeModule],
    }).compile();
    await module.init();

    runtime = module.get(AgentRuntimeService);
    agentRegistry = module.get(AgentRegistryService);
    workflowRegistry = module.get(WorkflowRegistryService);
    toolRegistry = module.get(ToolRegistryService);
    toolDiscovery = module.get(ToolDiscoveryService);
  });

  afterAll(async () => {
    await module.close();
  });

  it('registers all six production tools on module init', () => {
    const ids = toolDiscovery.listAll().map((metadata) => metadata.id).sort();
    expect(ids).toEqual([
      'tool.datetime',
      'tool.json',
      'tool.markdown',
      'tool.text',
      'tool.uuid',
      'tool.validation',
    ]);
  });

  it('executes the uuid tool directly through the ToolRegistryService', async () => {
    const result = await toolRegistry.execute(
      'tool.uuid',
      { count: 2 },
      { traceId: 'trace-direct', userId: 'user-1', metadata: {} },
    );

    expect(result.status).toBe('SUCCESS');
    expect((result.output?.uuids as string[]).length).toBe(2);
  });

  it('runs the text tool end to end as a workflow tool step via Agent Runtime', async () => {
    agentRegistry.register({ id: 'text-agent', name: 'Text Agent', workflowId: 'text-workflow' });
    workflowRegistry.register({
      workflowId: 'text-workflow',
      name: 'Text Workflow',
      steps: [
        {
          stepId: 'slugify-title',
          name: 'Slugify title',
          kind: 'tool',
          target: 'tool.text',
          input: { operation: 'slugify', text: 'Hello, Agent Tools!' },
        },
      ],
    });

    const result = await runtime.run(buildRequest('text-agent'));

    expect(result.status).toBe('success');
    expect(result.steps.map((s) => s.status)).toEqual(['completed']);
    expect(result.output['slugify-title']).toEqual({ text: 'hello-agent-tools' });
  });

  it('surfaces a tool failure as a TOOL_FAILURE step through Agent Runtime', async () => {
    agentRegistry.register({ id: 'failing-agent', name: 'Failing Agent', workflowId: 'failing-workflow' });
    workflowRegistry.register({
      workflowId: 'failing-workflow',
      name: 'Failing Workflow',
      steps: [
        {
          stepId: 'bad-datetime',
          name: 'Parse invalid date',
          kind: 'tool',
          target: 'tool.datetime',
          input: { operation: 'parse', value: 'not-a-date' },
        },
      ],
    });

    const result = await runtime.run(buildRequest('failing-agent'));

    expect(result.status).toBe('failure');
    expect(result.steps[0].status).toBe('failed');
  });
});
