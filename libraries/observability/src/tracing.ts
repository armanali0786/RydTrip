import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

/**
 * Must be the first thing a service's main.ts imports/calls — OpenTelemetry's
 * auto-instrumentations patch http/express/ioredis/kafkajs/pg by hooking
 * `require`, which only works if this runs before those modules are first
 * required anywhere else in the process.
 */
export function initTracing(serviceName: string): void {
  const url = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://jaeger:4318/v1/traces';

  const sdk = new NodeSDK({
    serviceName,
    traceExporter: new OTLPTraceExporter({ url }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Both are extremely high-volume and low-signal for this app.
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
      }),
    ],
  });

  sdk.start();

  const shutdown = () => {
    sdk.shutdown().finally(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
