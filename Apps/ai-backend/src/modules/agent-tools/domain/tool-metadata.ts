export type ToolCategory = 'utility' | 'text' | 'data' | 'validation' | 'datetime';

export type ToolSchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';

export interface ToolParamSchema {
  type: ToolSchemaType;
  description?: string;
  properties?: Record<string, ToolParamSchema>;
  items?: ToolParamSchema;
  enum?: unknown[];
}

export interface ToolIoSchema {
  type: 'object';
  properties: Record<string, ToolParamSchema>;
  required?: string[];
}

export interface ToolMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  category: ToolCategory;
  inputSchema: ToolIoSchema;
  outputSchema: ToolIoSchema;
}

/**
 * Structural validation only (types/enum/required) - there is no zod/ajv
 * dependency in this repo, so this mirrors the manual typeof/Array.isArray
 * guard style already used elsewhere (e.g. KnowledgePlannerService).
 */
export function validateAgainstSchema(value: unknown, schema: ToolIoSchema): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return ['Input must be an object'];
  }

  const record = value as Record<string, unknown>;
  const errors: string[] = [];

  for (const requiredKey of schema.required ?? []) {
    if (!(requiredKey in record)) {
      errors.push(`Missing required field: ${requiredKey}`);
    }
  }

  for (const [key, propSchema] of Object.entries(schema.properties)) {
    if (!(key in record)) continue;

    const fieldValue = record[key];
    if (!matchesType(fieldValue, propSchema.type)) {
      errors.push(`Field "${key}" expected type ${propSchema.type}`);
      continue;
    }

    if (propSchema.enum && !propSchema.enum.includes(fieldValue)) {
      errors.push(`Field "${key}" must be one of: ${propSchema.enum.join(', ')}`);
    }
  }

  return errors;
}

function matchesType(value: unknown, type: ToolSchemaType): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'any':
      return true;
    default:
      return true;
  }
}
