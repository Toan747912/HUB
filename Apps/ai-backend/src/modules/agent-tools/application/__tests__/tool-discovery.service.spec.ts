import { IAgentTool } from '../../domain/tool.types';
import { ToolDiscoveryService } from '../tool-discovery.service';
import { ToolRegistryService } from '../tool-registration.service';

function buildTool(id: string, name: string, description: string, category: IAgentTool['metadata']['category']): IAgentTool {
  return {
    metadata: {
      id,
      name,
      description,
      version: '1.0.0',
      category,
      inputSchema: { type: 'object', properties: {} },
      outputSchema: { type: 'object', properties: {} },
    },
    execute: jest.fn(async () => ({})),
  };
}

describe('ToolDiscoveryService', () => {
  let registry: ToolRegistryService;
  let discovery: ToolDiscoveryService;

  beforeEach(() => {
    registry = new ToolRegistryService();
    registry.register(buildTool('tool.uuid', 'UUID Generator', 'Generates UUIDs.', 'utility'));
    registry.register(buildTool('tool.text', 'Text Utility', 'Transforms text.', 'text'));
    registry.register(buildTool('tool.json', 'JSON Utility', 'Parses JSON.', 'data'));

    discovery = new ToolDiscoveryService(registry);
  });

  it('lists all registered tool metadata', () => {
    expect(discovery.listAll().map((m) => m.id).sort()).toEqual(['tool.json', 'tool.text', 'tool.uuid']);
  });

  it('filters by category', () => {
    expect(discovery.listByCategory('text').map((m) => m.id)).toEqual(['tool.text']);
  });

  it('searches by id, name, or description (case-insensitive)', () => {
    expect(discovery.search('uuid').map((m) => m.id)).toEqual(['tool.uuid']);
    expect(discovery.search('PARSES').map((m) => m.id)).toEqual(['tool.json']);
    expect(discovery.search('nonexistent')).toEqual([]);
  });

  it('returns all tools when the search query is blank', () => {
    expect(discovery.search('   ').length).toBe(3);
  });
});
