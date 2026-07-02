import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Context, Span, SpanStatusCode, Tracer, context, trace } from '@opentelemetry/api';
import { ConsoleSpanExporter, InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { getTelemetryConfig } from './telemetry.config';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

@Injectable()
export class TracerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TracerService.name);
  private provider: NodeTracerProvider | null = null;
  private tracer: Tracer | null = null;
  private readonly inMemoryExporter = new InMemorySpanExporter();

  onModuleInit(): void {
    const { serviceName, otlpEndpoint } = getTelemetryConfig();

    // No live OTLP collector is assumed to be reachable by default; spans always land
    // in the in-memory exporter (inspectable/testable) and the console exporter
    // (production log stream). OTLP export is a drop-in addition once a collector
    // endpoint is confirmed reachable — see ObservabilityReadinessReview.md.
    this.provider = new NodeTracerProvider({
      resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: serviceName }),
      spanProcessors: [new SimpleSpanProcessor(this.inMemoryExporter), new SimpleSpanProcessor(new ConsoleSpanExporter())]
    });
    this.provider.register();
    this.tracer = trace.getTracer(serviceName);

    this.logger.log(
      JSON.stringify({ event: 'telemetry_initialized', serviceName, otlpConfigured: otlpEndpoint !== null, timestamp: new Date().toISOString() })
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.provider?.shutdown().catch(() => undefined);
  }

  isInitialized(): boolean {
    return this.tracer !== null;
  }

  startSpan(name: string, attributes: Record<string, string | number | boolean> = {}, parentContext?: Context): Span {
    const tracer = this.tracer ?? trace.getTracer('ai-backend');
    return tracer.startSpan(name, { attributes }, parentContext ?? context.active());
  }

  async withSpan<T>(
    name: string,
    attributes: Record<string, string | number | boolean>,
    fn: (span: Span) => Promise<T> | T,
    parentContext?: Context
  ): Promise<T> {
    const baseContext = parentContext ?? context.active();
    const span = this.startSpan(name, attributes, baseContext);
    const activeContext = trace.setSpan(baseContext, span);

    try {
      return await context.with(activeContext, () => fn(span));
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
      throw error;
    } finally {
      span.end();
    }
  }

  getCurrentTraceContext(): TraceContext | null {
    const span = trace.getActiveSpan();
    if (!span) return null;
    const spanContext = span.spanContext();
    return { traceId: spanContext.traceId, spanId: spanContext.spanId };
  }

  /**
   * Parses a W3C `traceparent` header (`00-<traceId>-<spanId>-<flags>`) into an OTel
   * Context carrying a remote parent span, for HTTP entrypoint trace propagation.
   */
  extractContextFromHeaders(headers: Record<string, string | string[] | undefined>): Context {
    const raw = headers['traceparent'];
    const traceparent = Array.isArray(raw) ? raw[0] : raw;
    if (!traceparent) return context.active();

    const parts = traceparent.split('-');
    if (parts.length !== 4) return context.active();
    const [version, traceId, spanId, flags] = parts;
    if (version !== '00' || traceId.length !== 32 || spanId.length !== 16) return context.active();

    const remoteSpanContext = {
      traceId,
      spanId,
      traceFlags: parseInt(flags, 16) || 0,
      isRemote: true
    };
    return trace.setSpanContext(context.active(), remoteSpanContext);
  }

  getFinishedSpansForTesting() {
    return this.inMemoryExporter.getFinishedSpans();
  }

  resetForTesting(): void {
    this.inMemoryExporter.reset();
  }
}
