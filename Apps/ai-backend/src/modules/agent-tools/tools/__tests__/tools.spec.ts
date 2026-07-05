import { DateTimeTool } from '../datetime.tool';
import { JsonTool } from '../json.tool';
import { MarkdownTool } from '../markdown.tool';
import { TextTool } from '../text.tool';
import { UuidTool } from '../uuid.tool';
import { ValidationTool } from '../validation.tool';

describe('UuidTool', () => {
  const tool = new UuidTool();

  it('generates a single v4 uuid by default', async () => {
    const result = await tool.execute({});
    expect(result.uuids).toHaveLength(1);
    expect(result.uuids as string[]).toEqual([expect.stringMatching(/^[0-9a-f-]{36}$/)]);
  });

  it('generates the requested count of uuids', async () => {
    const result = await tool.execute({ count: 3 });
    expect((result.uuids as string[]).length).toBe(3);
    expect(new Set(result.uuids as string[]).size).toBe(3);
  });
});

describe('DateTimeTool', () => {
  const tool = new DateTimeTool();

  it('returns the current time for "now"', async () => {
    const result = await tool.execute({ operation: 'now' });
    expect(typeof result.iso).toBe('string');
    expect(typeof result.epochMs).toBe('number');
  });

  it('parses an ISO date string', async () => {
    const result = await tool.execute({ operation: 'parse', value: '2026-01-01T00:00:00.000Z' });
    expect(result.iso).toBe('2026-01-01T00:00:00.000Z');
  });

  it('adds a duration to a date', async () => {
    const result = await tool.execute({
      operation: 'add',
      value: '2026-01-01T00:00:00.000Z',
      amountMs: 60_000,
    });
    expect(result.iso).toBe('2026-01-01T00:01:00.000Z');
  });

  it('computes the difference between two dates', async () => {
    const result = await tool.execute({
      operation: 'diff',
      value: '2026-01-01T00:00:00.000Z',
      otherValue: '2026-01-01T00:01:00.000Z',
    });
    expect(result.diffMs).toBe(60_000);
  });

  it('throws for an invalid date value', async () => {
    await expect(tool.execute({ operation: 'parse', value: 'not-a-date' })).rejects.toThrow('Invalid date value');
  });
});

describe('JsonTool', () => {
  const tool = new JsonTool();

  it('parses JSON text', async () => {
    const result = await tool.execute({ operation: 'parse', text: '{"a":1}' });
    expect(result.value).toEqual({ a: 1 });
  });

  it('stringifies a value', async () => {
    const result = await tool.execute({ operation: 'stringify', value: { a: 1 } });
    expect(result.text).toBe('{"a":1}');
  });

  it('validates well-formed and malformed JSON', async () => {
    await expect(tool.execute({ operation: 'validate', text: '{"a":1}' })).resolves.toEqual({ valid: true });
    const invalid = await tool.execute({ operation: 'validate', text: '{a:1}' });
    expect(invalid.valid).toBe(false);
    expect(typeof invalid.error).toBe('string');
  });
});

describe('MarkdownTool', () => {
  const tool = new MarkdownTool();

  it('strips markdown formatting to plain text', async () => {
    const result = await tool.execute({ operation: 'toPlainText', text: '# Title\n\n**bold** text' });
    expect(result.text).toBe('Title\nbold text');
  });

  it('extracts links', async () => {
    const result = await tool.execute({ operation: 'extractLinks', text: 'See [docs](https://example.com).' });
    expect(result.links).toEqual([{ label: 'docs', url: 'https://example.com' }]);
  });

  it('extracts headings with their levels', async () => {
    const result = await tool.execute({ operation: 'extractHeadings', text: '# One\n## Two' });
    expect(result.headings).toEqual([
      { level: 1, text: 'One' },
      { level: 2, text: 'Two' },
    ]);
  });
});

describe('TextTool', () => {
  const tool = new TextTool();

  it('trims, upper-cases, and lower-cases text', async () => {
    expect(await tool.execute({ operation: 'trim', text: '  hi  ' })).toEqual({ text: 'hi' });
    expect(await tool.execute({ operation: 'upper', text: 'hi' })).toEqual({ text: 'HI' });
    expect(await tool.execute({ operation: 'lower', text: 'HI' })).toEqual({ text: 'hi' });
  });

  it('truncates long text', async () => {
    const result = await tool.execute({ operation: 'truncate', text: 'hello world', maxLength: 5 });
    expect(result.text).toBe('hello...');
  });

  it('slugifies text', async () => {
    const result = await tool.execute({ operation: 'slugify', text: 'Hello, World!' });
    expect(result.text).toBe('hello-world');
  });

  it('counts words', async () => {
    expect(await tool.execute({ operation: 'wordCount', text: 'one two three' })).toEqual({ count: 3 });
    expect(await tool.execute({ operation: 'wordCount', text: '   ' })).toEqual({ count: 0 });
  });
});

describe('ValidationTool', () => {
  const tool = new ValidationTool();

  it('validates a value against a schema', async () => {
    const schema = { type: 'object' as const, properties: { name: { type: 'string' as const } }, required: ['name'] };
    expect(await tool.execute({ value: { name: 'ok' }, schema })).toEqual({ valid: true, errors: [] });
    expect(await tool.execute({ value: {}, schema })).toEqual({
      valid: false,
      errors: ['Missing required field: name'],
    });
  });

  it('throws when the schema is malformed', async () => {
    await expect(tool.execute({ value: {}, schema: {} })).rejects.toThrow('Expected "schema"');
  });
});
