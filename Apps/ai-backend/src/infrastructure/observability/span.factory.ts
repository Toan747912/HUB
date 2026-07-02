export interface SpanAttributesInput {
  operation: string;
  aggregateId?: string;
  [key: string]: string | number | boolean | undefined;
}

export class SpanFactory {
  static attributesFor(input: SpanAttributesInput): Record<string, string | number | boolean> {
    const attributes: Record<string, string | number | boolean> = { operation: input.operation };
    if (input.aggregateId !== undefined) {
      attributes['aggregateId'] = input.aggregateId;
    }
    for (const [key, value] of Object.entries(input)) {
      if (key === 'operation' || key === 'aggregateId' || value === undefined) continue;
      attributes[key] = value;
    }
    return attributes;
  }
}
