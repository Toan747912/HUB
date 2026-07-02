export interface TelemetryConfig {
  serviceName: string;
  otlpEndpoint: string | null;
}

export function getTelemetryConfig(): TelemetryConfig {
  return {
    serviceName: process.env['OTEL_SERVICE_NAME'] ?? 'ai-backend',
    otlpEndpoint: process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ?? null
  };
}
