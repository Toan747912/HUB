import { ToolIoSchema, validateAgainstSchema } from '../tool-metadata';

describe('validateAgainstSchema', () => {
  const schema: ToolIoSchema = {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['now', 'parse'] },
      amountMs: { type: 'number' },
    },
    required: ['operation'],
  };

  it('returns no errors for a valid value', () => {
    expect(validateAgainstSchema({ operation: 'now' }, schema)).toEqual([]);
  });

  it('rejects a non-object value', () => {
    expect(validateAgainstSchema('not-an-object', schema)).toEqual(['Input must be an object']);
    expect(validateAgainstSchema(null, schema)).toEqual(['Input must be an object']);
    expect(validateAgainstSchema(['array'], schema)).toEqual(['Input must be an object']);
  });

  it('reports missing required fields', () => {
    expect(validateAgainstSchema({}, schema)).toEqual(['Missing required field: operation']);
  });

  it('reports a type mismatch', () => {
    expect(validateAgainstSchema({ operation: 'now', amountMs: 'oops' }, schema)).toEqual([
      'Field "amountMs" expected type number',
    ]);
  });

  it('reports an enum violation', () => {
    expect(validateAgainstSchema({ operation: 'unsupported' }, schema)).toEqual([
      'Field "operation" must be one of: now, parse',
    ]);
  });

  it('ignores unknown fields not declared in the schema', () => {
    expect(validateAgainstSchema({ operation: 'now', extra: true }, schema)).toEqual([]);
  });
});
