import { AuditLogService } from '../../../../infrastructure/audit/audit-log.service';
import { MetricsService } from '../../../../infrastructure/observability/metrics.service';
import { StructuredLoggerService } from '../../../../infrastructure/observability/structured-logger.service';
import { IAgentContext } from '../../../agent-core/domain/interfaces';
import { ToolMetadata } from '../../domain/tool-metadata';
import { IAgentTool, ToolErrorCode, ToolExecutionError } from '../../domain/tool.types';
import { ToolRegistryService } from '../tool-registration.service';

function buildContext(): IAgentContext {
  return { traceId: 'trace-1', userId: 'user-1', sessionId: 'session-1', metadata: {} };
}

function buildTool(overrides: Partial<ToolMetadata> = {}): IAgentTool {
  return {
    metadata: {
      id: 'tool.echo',
      name: 'Echo Tool',
      description: 'Echoes input back.',
      version: '1.0.0',
      category: 'utility',
      inputSchema: {
        type: 'object',
        properties: { message: { type: 'string' } },
        required: ['message'],
      },
      outputSchema: {
        type: 'object',
        properties: { message: { type: 'string' } },
      },
      ...overrides,
    },
    execute: jest.fn(async (input: Record<string, unknown>) => ({ message: input.message })),
  };
}

describe('ToolRegistryService', () => {
  let metrics: jest.Mocked<Pick<MetricsService, 'recordPlannerOutcome'>>;
  let structuredLogger: jest.Mocked<Pick<StructuredLoggerService, 'log'>>;
  let auditLog: jest.Mocked<Pick<AuditLogService, 'recordSecurityEvent'>>;
  let registry: ToolRegistryService;
  const context = buildContext();

  beforeEach(() => {
    metrics = { recordPlannerOutcome: jest.fn() };
    structuredLogger = { log: jest.fn() };
    auditLog = { recordSecurityEvent: jest.fn().mockResolvedValue(undefined) };

    registry = new ToolRegistryService(
      metrics as unknown as MetricsService,
      structuredLogger as unknown as StructuredLoggerService,
      auditLog as unknown as AuditLogService,
    );
  });

  describe('register/unregister/find/list', () => {
    it('registers a tool and finds it by id', () => {
      const tool = buildTool();
      registry.register(tool);

      expect(registry.find('tool.echo')).toBe(tool);
    });

    it('throws DUPLICATE_TOOL when registering the same id twice', () => {
      registry.register(buildTool());

      expect(() => registry.register(buildTool())).toThrow(ToolExecutionError);
      try {
        registry.register(buildTool());
        fail('expected register to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(ToolExecutionError);
        expect((error as ToolExecutionError).code).toBe(ToolErrorCode.DUPLICATE_TOOL);
      }
    });

    it('unregisters a tool', () => {
      registry.register(buildTool());

      expect(registry.unregister('tool.echo')).toBe(true);
      expect(registry.find('tool.echo')).toBeUndefined();
      expect(registry.unregister('tool.echo')).toBe(false);
    });

    it('lists all tools, optionally filtered by category', () => {
      registry.register(buildTool({ id: 'tool.echo', category: 'utility' }));
      registry.register(buildTool({ id: 'tool.text', category: 'text' }));

      expect(registry.list().map((m) => m.id).sort()).toEqual(['tool.echo', 'tool.text']);
      expect(registry.list('text').map((m) => m.id)).toEqual(['tool.text']);
    });
  });

  describe('execute', () => {
    it('returns a SUCCESS result and emits log/metric/audit', async () => {
      registry.register(buildTool());

      const result = await registry.execute('tool.echo', { message: 'hi' }, context);

      expect(result).toMatchObject({ toolId: 'tool.echo', status: 'SUCCESS', output: { message: 'hi' } });
      expect(typeof result.durationMs).toBe('number');

      expect(structuredLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'AGENT_TOOL_EXECUTE', status: 'SUCCESS', aggregateId: 'tool.echo' }),
      );
      expect(metrics.recordPlannerOutcome).toHaveBeenCalledWith(
        expect.objectContaining({ capability: 'agent_tool_tool.echo', status: 'SUCCESS' }),
      );
      expect(auditLog.recordSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'AGENT_TOOL_SUCCESS', resource: 'AgentTool:tool.echo' }),
      );
    });

    it('returns TOOL_NOT_FOUND without throwing when the tool is unregistered', async () => {
      const result = await registry.execute('missing-tool', {}, context);

      expect(result.status).toBe('FAILURE');
      expect(result.error).toMatchObject({ code: ToolErrorCode.TOOL_NOT_FOUND });
    });

    it('returns INVALID_INPUT when input fails schema validation', async () => {
      registry.register(buildTool());

      const result = await registry.execute('tool.echo', {}, context);

      expect(result.status).toBe('FAILURE');
      expect(result.error?.code).toBe(ToolErrorCode.INVALID_INPUT);
    });

    it('returns EXECUTION_FAILED when the tool throws', async () => {
      const tool = buildTool();
      (tool.execute as jest.Mock).mockRejectedValue(new Error('boom'));
      registry.register(tool);

      const result = await registry.execute('tool.echo', { message: 'hi' }, context);

      expect(result.status).toBe('FAILURE');
      expect(result.error).toMatchObject({ code: ToolErrorCode.EXECUTION_FAILED, message: 'boom' });
    });

    it('does not throw when metrics, structuredLogger, and auditLog are omitted (all optional)', async () => {
      const bareRegistry = new ToolRegistryService();
      bareRegistry.register(buildTool());

      await expect(bareRegistry.execute('tool.echo', { message: 'hi' }, context)).resolves.toMatchObject({
        status: 'SUCCESS',
      });
    });
  });
});
