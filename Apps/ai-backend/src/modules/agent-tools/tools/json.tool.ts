import { Injectable } from '@nestjs/common';
import { ToolMetadata } from '../domain/tool-metadata';
import { IAgentTool } from '../domain/tool.types';

@Injectable()
export class JsonTool implements IAgentTool {
  readonly metadata: ToolMetadata = {
    id: 'tool.json',
    name: 'JSON Utility',
    description: 'Parses, stringifies, and validates JSON text.',
    version: '1.0.0',
    category: 'data',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['parse', 'stringify', 'validate'] },
        text: { type: 'string' },
        value: { type: 'any' },
        pretty: { type: 'boolean' },
      },
      required: ['operation'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        value: { type: 'any' },
        text: { type: 'string' },
        valid: { type: 'boolean' },
        error: { type: 'string' },
      },
    },
  };

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const operation = input.operation as string;

    switch (operation) {
      case 'parse': {
        if (typeof input.text !== 'string') throw new Error('Expected "text" to be a string');
        return { value: JSON.parse(input.text) };
      }
      case 'stringify': {
        const text = input.pretty ? JSON.stringify(input.value, null, 2) : JSON.stringify(input.value);
        return { text };
      }
      case 'validate': {
        if (typeof input.text !== 'string') throw new Error('Expected "text" to be a string');
        try {
          JSON.parse(input.text);
          return { valid: true };
        } catch (error) {
          return { valid: false, error: error instanceof Error ? error.message : String(error) };
        }
      }
      default:
        throw new Error(`Unsupported json operation: ${String(operation)}`);
    }
  }
}
