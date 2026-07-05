import { Injectable } from '@nestjs/common';
import { ToolCategory, ToolMetadata } from '../domain/tool-metadata';
import { ToolRegistryService } from './tool-registration.service';

@Injectable()
export class ToolDiscoveryService {
  constructor(private readonly registry: ToolRegistryService) {}

  listAll(): ToolMetadata[] {
    return this.registry.list();
  }

  listByCategory(category: ToolCategory): ToolMetadata[] {
    return this.registry.list(category);
  }

  search(query: string): ToolMetadata[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return this.listAll();

    return this.registry
      .list()
      .filter(
        (metadata) =>
          metadata.id.toLowerCase().includes(normalized) ||
          metadata.name.toLowerCase().includes(normalized) ||
          metadata.description.toLowerCase().includes(normalized),
      );
  }
}
