import { Injectable } from '@nestjs/common';
import { ToolMetadata } from '../domain/tool-metadata';
import { IAgentTool } from '../domain/tool.types';

@Injectable()
export class MarkdownTool implements IAgentTool {
  readonly metadata: ToolMetadata = {
    id: 'tool.markdown',
    name: 'Markdown Utility',
    description: 'Strips markdown to plain text and extracts links or headings.',
    version: '1.0.0',
    category: 'text',
    inputSchema: {
      type: 'object',
      properties: {
        operation: { type: 'string', enum: ['toPlainText', 'extractLinks', 'extractHeadings'] },
        text: { type: 'string' },
      },
      required: ['operation', 'text'],
    },
    outputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        links: { type: 'array', items: { type: 'object' } },
        headings: { type: 'array', items: { type: 'object' } },
      },
    },
  };

  async execute(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const operation = input.operation as string;
    const text = input.text as string;

    switch (operation) {
      case 'toPlainText':
        return { text: this.stripMarkdown(text) };
      case 'extractLinks':
        return { links: this.extractLinks(text) };
      case 'extractHeadings':
        return { headings: this.extractHeadings(text) };
      default:
        throw new Error(`Unsupported markdown operation: ${String(operation)}`);
    }
  }

  private stripMarkdown(text: string): string {
    return text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/!\[[^\]]*]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
      .replace(/[#*_`>~-]/g, '')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  private extractLinks(text: string): Array<{ label: string; url: string }> {
    const matches = [...text.matchAll(/\[([^\]]*)]\(([^)]*)\)/g)];
    return matches.map((match) => ({ label: match[1], url: match[2] }));
  }

  private extractHeadings(text: string): Array<{ level: number; text: string }> {
    const matches = [...text.matchAll(/^(#{1,6})\s+(.*)$/gm)];
    return matches.map((match) => ({ level: match[1].length, text: match[2].trim() }));
  }
}
