import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ToolMetadata } from '../domain/tool-metadata';
import { IAgentTool } from '../domain/tool.types';

@Injectable()
export class UuidTool implements IAgentTool {
  readonly metadata: ToolMetadata = {
    id: 'tool.uuid',
    name: 'UUID Generator',
    description: 'Generates one or more RFC 4122 v4 UUIDs.',
    version: '1.0.0',
    category: 'utility',
    inputSchema: {
      type: 'object',
      properties: {
        count: { type: 'number', description: 'Number of UUIDs to generate (default 1).' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        uuids: { type: 'array', description: 'Generated UUIDs.', items: { type: 'string' } },
      },
      required: ['uuids'],
    },
  };

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const count = typeof input.count === 'number' && input.count > 0 ? Math.floor(input.count) : 1;
    const uuids = Array.from({ length: count }, () => randomUUID());
    return { uuids };
  }
}
