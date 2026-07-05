import { Injectable } from '@nestjs/common';
import { ToolIoSchema, ToolMetadata, validateAgainstSchema } from '../domain/tool-metadata';
import { IAgentTool } from '../domain/tool.types';

@Injectable()
export class ValidationTool implements IAgentTool {
  readonly metadata: ToolMetadata = {
    id: 'tool.validation',
    name: 'Schema Validation Utility',
    description: 'Validates an object value against a tool-style JSON schema.',
    version: '1.0.0',
    category: 'validation',
    inputSchema: {
      type: 'object',
      properties: {
        value: { type: 'object' },
        schema: { type: 'object' },
      },
      required: ['value', 'schema'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean' },
        errors: { type: 'array', items: { type: 'string' } },
      },
      required: ['valid', 'errors'],
    },
  };

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const schema = input.schema as ToolIoSchema;
    if (!schema || typeof schema !== 'object' || !schema.properties) {
      throw new Error('Expected "schema" to be an object with a "properties" field');
    }

    const errors = validateAgainstSchema(input.value, schema);
    return { valid: errors.length === 0, errors };
  }
}
