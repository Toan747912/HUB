import { Injectable } from '@nestjs/common';
import { ToolMetadata } from '../domain/tool-metadata';
import { IAgentTool } from '../domain/tool.types';

@Injectable()
export class DateTimeTool implements IAgentTool {
  readonly metadata: ToolMetadata = {
    id: 'tool.datetime',
    name: 'DateTime Utility',
    description: 'Provides current time, parses dates, adds durations, and computes differences.',
    version: '1.0.0',
    category: 'datetime',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['now', 'parse', 'add', 'diff'] },
        value: { type: 'string', description: 'ISO date string (parse/add/diff).' },
        amountMs: { type: 'number', description: 'Milliseconds to add (add).' },
        otherValue: { type: 'string', description: 'Second ISO date string (diff).' },
      },
      required: ['operation'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        iso: { type: 'string' },
        epochMs: { type: 'number' },
        diffMs: { type: 'number' },
      },
    },
  };

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const operation = input.operation as string;

    switch (operation) {
      case 'now': {
        const now = new Date();
        return { iso: now.toISOString(), epochMs: now.getTime() };
      }
      case 'parse': {
        const parsed = this.parseDate(input.value);
        return { iso: parsed.toISOString(), epochMs: parsed.getTime() };
      }
      case 'add': {
        const base = this.parseDate(input.value);
        const amountMs = typeof input.amountMs === 'number' ? input.amountMs : 0;
        const result = new Date(base.getTime() + amountMs);
        return { iso: result.toISOString(), epochMs: result.getTime() };
      }
      case 'diff': {
        const first = this.parseDate(input.value);
        const second = this.parseDate(input.otherValue);
        return { diffMs: second.getTime() - first.getTime() };
      }
      default:
        throw new Error(`Unsupported datetime operation: ${String(operation)}`);
    }
  }

  private parseDate(value: unknown): Date {
    if (typeof value !== 'string') throw new Error('Expected an ISO date string');
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid date value: ${value}`);
    return parsed;
  }
}
