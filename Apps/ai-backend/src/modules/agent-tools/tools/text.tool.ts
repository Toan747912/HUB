import { Injectable } from '@nestjs/common';
import { ToolMetadata } from '../domain/tool-metadata';
import { IAgentTool } from '../domain/tool.types';

@Injectable()
export class TextTool implements IAgentTool {
  readonly metadata: ToolMetadata = {
    id: 'tool.text',
    name: 'Text Utility',
    description: 'Trims, cases, truncates, slugifies, and counts words in text.',
    version: '1.0.0',
    category: 'text',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['trim', 'upper', 'lower', 'truncate', 'slugify', 'wordCount'] },
        text: { type: 'string' },
        maxLength: { type: 'number' },
      },
      required: ['operation', 'text'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        count: { type: 'number' },
      },
    },
  };

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const operation = input.operation as string;
    const text = input.text as string;

    switch (operation) {
      case 'trim':
        return { text: text.trim() };
      case 'upper':
        return { text: text.toUpperCase() };
      case 'lower':
        return { text: text.toLowerCase() };
      case 'truncate': {
        const maxLength = typeof input.maxLength === 'number' ? input.maxLength : text.length;
        return { text: text.length > maxLength ? `${text.slice(0, maxLength)}...` : text };
      }
      case 'slugify':
        return {
          text: text
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, ''),
        };
      case 'wordCount':
        return { count: text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length };
      default:
        throw new Error(`Unsupported text operation: ${String(operation)}`);
    }
  }
}
