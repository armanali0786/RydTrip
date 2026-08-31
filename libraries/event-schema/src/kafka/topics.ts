/**
 * Canonical Kafka topic names, per docs/architecture/overview.md and
 * docs/roadmap/PHASES.md Phase 5. Declared once here so producers and
 * consumers across services never drift on a literal string. Only
 * RIDE_REQUESTED / RIDE_CANCELLED are actually produced/consumed as of
 * Phase 5 — the rest are reserved for the phases that introduce them
 * (Phase 6 driver status, Phase 7 trip lifecycle).
 */
export const KAFKA_TOPICS = {
  RIDE_REQUESTED: 'ride.requested',
  RIDE_CANCELLED: 'ride.cancelled',
  DRIVER_STATUS_CHANGED: 'driver.status.changed',
  TRIP_STARTED: 'trip.started',
  TRIP_COMPLETED: 'trip.completed',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];
