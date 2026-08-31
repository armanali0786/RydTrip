/**
 * Canonical Kafka topic names, per docs/architecture/overview.md and
 * docs/roadmap/PHASES.md. Declared once here so producers and consumers
 * across services never drift on a literal string.
 * RIDE_REQUESTED / RIDE_CANCELLED (Phase 5) and DRIVER_LOCATION_UPDATED
 * (Phase 6) are produced today. DRIVER_STATUS_CHANGED, TRIP_STARTED, and
 * TRIP_COMPLETED are reserved for the phases that introduce them (Phase 7).
 */
export const KAFKA_TOPICS = {
  RIDE_REQUESTED: 'ride.requested',
  RIDE_CANCELLED: 'ride.cancelled',
  DRIVER_STATUS_CHANGED: 'driver.status.changed',
  DRIVER_LOCATION_UPDATED: 'driver.location.updated',
  TRIP_STARTED: 'trip.started',
  TRIP_COMPLETED: 'trip.completed',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];
