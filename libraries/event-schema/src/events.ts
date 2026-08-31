/**
 * Kafka event envelope shape, defined here ahead of Phase 5 so downstream
 * types don't need to change when producers/consumers are wired up.
 * Not used by any transport in Phase 2 — REST calls carry payloads directly.
 */
export interface EventEnvelope<TPayload = unknown> {
  eventId: string;
  eventType: string;
  version: number;
  timestamp: string;
  correlationId: string;
  producer: string;
  payload: TPayload;
}
