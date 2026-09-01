import { trace } from '@opentelemetry/api';

/**
 * Tags the currently active span with the app's own x-correlation-id (see
 * each service's use of that header) so a trace in Jaeger can be found by
 * the same id already used for cross-service log correlation — the two
 * correlation mechanisms line up instead of being two separate identifiers.
 */
export function tagCorrelationId(correlationId: string): void {
  trace.getActiveSpan()?.setAttribute('correlationId', correlationId);
}
