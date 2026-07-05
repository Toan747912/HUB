import { Test, TestingModule } from '@nestjs/testing';
import { IAgentRequest } from '../../agent-core/domain/interfaces';
import { AgentRegistryService } from '../../agent-runtime/application/agent-registry.service';
import { AgentRuntimeService } from '../../agent-runtime/application/agent-runtime.service';
import { WorkflowRegistryService } from '../../agent-runtime/application/workflow-registry.service';
import { AgentRuntimeModule } from '../../agent-runtime/agent-runtime.module';

/**
 * Proves that a real 'memory' workflow step, run through the full
 * AgentRuntimeModule DI graph, persists to Postgres via the agent-memory
 * module rather than the old in-process Map — i.e. the value survives across
 * independently-booted TestingModule instances against the same database
 * (DATABASE_URL from the environment, shared by every PrismaService).
 */
describe('Agent Memory — runtime integration', () => {
  function buildRequest(agentId: string, operation: 'read' | 'write', value?: unknown): IAgentRequest {
    return {
      requestId: `req-${operation}`,
      agentId,
      goal: 'exercise memory step',
      input: { value },
      context: {
        traceId: 'trace-memory-1',
        userId: 'user-memory-1',
        sessionId: 'session-memory-1',
        metadata: {},
      },
    };
  }

  async function bootModule(): Promise<TestingModule> {
    return Test.createTestingModule({
      imports: [AgentRuntimeModule],
    }).compile();
  }

  it('writes a memory value in one module instance and reads it back from a fresh instance', async () => {
    const writerModule = await bootModule();
    const writerRuntime = writerModule.get(AgentRuntimeService);
    const writerAgents = writerModule.get(AgentRegistryService);
    const writerWorkflows = writerModule.get(WorkflowRegistryService);

    writerAgents.register({ id: 'memory-agent', name: 'Memory Agent', workflowId: 'memory-write-workflow' });
    writerWorkflows.register({
      workflowId: 'memory-write-workflow',
      name: 'Memory Write Workflow',
      steps: [
        {
          stepId: 'store-fact',
          name: 'Store fact',
          kind: 'memory',
          target: 'fact',
          input: { operation: 'write', value: { learned: 'photosynthesis' } },
        },
      ],
    });

    const writeResult = await writerRuntime.run(buildRequest('memory-agent', 'write'));
    expect(writeResult.status).toBe('success');
    await writerModule.close();

    const readerModule = await bootModule();
    const readerRuntime = readerModule.get(AgentRuntimeService);
    const readerAgents = readerModule.get(AgentRegistryService);
    const readerWorkflows = readerModule.get(WorkflowRegistryService);

    readerAgents.register({ id: 'memory-agent', name: 'Memory Agent', workflowId: 'memory-read-workflow' });
    readerWorkflows.register({
      workflowId: 'memory-read-workflow',
      name: 'Memory Read Workflow',
      steps: [
        { stepId: 'load-fact', name: 'Load fact', kind: 'memory', target: 'fact', input: { operation: 'read' } },
      ],
    });

    const readResult = await readerRuntime.run(buildRequest('memory-agent', 'read'));
    expect(readResult.status).toBe('success');
    expect(readResult.output['load-fact']).toEqual({ value: { learned: 'photosynthesis' } });

    await readerModule.close();
  });
});
