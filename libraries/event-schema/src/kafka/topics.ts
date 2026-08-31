/**
 * Canonical Kafka topic names, per docs/architecture/overview.md and
 * docs/roadmap/PHASES.md. Declared once here so producers and consumers
 * across services never drift on a literal string.
 * RIDE_REQUESTED / RIDE_CANCELLED (Phase 5), DRIVER_LOCATION_UPDATED
 * (Phase 6), and DRIVER_RESERVED / DRIVER_ACCEPTED / DRIVER_REJECTED
 * (Phase 7) are produced today. DRIVER_STATUS_CHANGED, TRIP_STARTED, and
 * TRIP_COMPLETED are reserved for later phases (driver-app-driven status
 * changes and trip start/complete aren't wired up yet).
 */
export const KAFKA_TOPICS = {
  RIDE_REQUESTED: 'ride.requested',
  RIDE_CANCELLED: 'ride.cancelled',
  DRIVER_STATUS_CHANGED: 'driver.status.changed',
  DRIVER_LOCATION_UPDATED: 'driver.location.updated',
  DRIVER_RESERVED: 'driver.reserved',
  DRIVER_ACCEPTED: 'driver.accepted',
  DRIVER_REJECTED: 'driver.rejected',
  TRIP_STARTED: 'trip.started',
  TRIP_COMPLETED: 'trip.completed',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];
