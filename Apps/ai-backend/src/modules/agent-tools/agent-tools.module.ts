import { Module, OnModuleInit } from '@nestjs/common';
import { AuditModule } from '../../infrastructure/audit/audit.module';
import { TelemetryModule } from '../../infrastructure/observability/telemetry.module';
import { AgentCoreModule } from '../agent-core/agent-core.module';
import { ToolRegistryService as CoreToolRegistryService } from '../agent-core/infrastructure/tool-registry.service';
import { CoreToolAdapter } from './application/core-tool-adapter';
import { ToolDiscoveryService } from './application/tool-discovery.service';
import { ToolRegistryService } from './application/tool-registration.service';
import { IAgentTool } from './domain/tool.types';
import { DateTimeTool } from './tools/datetime.tool';
import { JsonTool } from './tools/json.tool';
import { MarkdownTool } from './tools/markdown.tool';
import { TextTool } from './tools/text.tool';
import { UuidTool } from './tools/uuid.tool';
import { ValidationTool } from './tools/validation.tool';

@Module({
  imports: [AgentCoreModule, TelemetryModule, AuditModule],
  providers: [
    ToolRegistryService,
    ToolDiscoveryService,
    UuidTool,
    DateTimeTool,
    JsonTool,
    MarkdownTool,
    TextTool,
    ValidationTool,
  ],
  exports: [ToolRegistryService, ToolDiscoveryService],
})
export class AgentToolsModule implements OnModuleInit {
  constructor(
    private readonly toolRegistry: ToolRegistryService,
    private readonly coreToolRegistry: CoreToolRegistryService,
    private readonly uuidTool: UuidTool,
    private readonly dateTimeTool: DateTimeTool,
    private readonly jsonTool: JsonTool,
    private readonly markdownTool: MarkdownTool,
    private readonly textTool: TextTool,
    private readonly validationTool: ValidationTool,
  ) {}

  onModuleInit(): void {
    const tools: IAgentTool[] = [
      this.uuidTool,
      this.dateTimeTool,
      this.jsonTool,
      this.markdownTool,
      this.textTool,
      this.validationTool,
    ];

    for (const tool of tools) {
      this.toolRegistry.register(tool);
      this.coreToolRegistry.register(
        new CoreToolAdapter(tool.metadata.id, tool.metadata.description, tool.metadata.id, this.toolRegistry),
      );
    }
  }
}
