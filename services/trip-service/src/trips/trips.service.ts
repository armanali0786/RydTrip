import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CancellationReason, DriverStatus, Ride, RideStatus } from '@rydtrip/event-schema';
import { assertValidRideTransition, InvalidRideTransitionError } from './ride-state-machine';
import { CreateRideInput, TripsRepository, TripsTx } from './trips.repository';

/** Matches the Kafka consumer group id in ride-events.consumer.ts — the processed_events key. */
const CONSUMER_NAME = 'trip-service';

/** Flat-rate fare model — no surge/time-of-day pricing, no payment processor. INR. */
const BASE_FARE = 40;
const PER_KM_RATE = 12;
const EARTH_RADIUS_KM = 6371;

const DEFAULT_HISTORY_LIMIT = 20;
const MAX_HISTORY_LIMIT = 50;

/** Great-circle distance between pickup and destination — the only distance signal this system has (no routing/traffic engine). */
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);
  private readonly driverServiceUrl = process.env.DRIVER_SERVICE_URL ?? 'http://localhost:3002';

  constructor(private readonly repository: TripsRepository) {}

  /**
   * Consumes ride.requested (Phase 5, replacing the retired Phase 2/3 HTTP
   * bridge). Dispatch Service (Phase 7) doesn't exist yet to do real
   * matching, so we advance REQUESTED -> MATCHING immediately — the guarded
   * transition Phase 7 will eventually drive from dispatch outcomes instead.
   *
   * `eventId` guards this against duplicate delivery (Phase 8) — both the
   * ride creation and the MATCHING transition happen inside the same
   * `processed_events`-checked transaction, so a replay is a clean no-op
   * rather than a second ride row or a duplicate audit entry.
   */
  async handleRideRequested(input: CreateRideInput, eventId: string): Promise<void> {
    const outcome = await this.repository.runIdempotent(eventId, CONSUMER_NAME, async (tx) => {
      const ride = await this.repository.create(input, tx);
      // Always valid immediately after creation (REQUESTED -> MATCHING) — no
      // guard check needed, unlike transitionTo()'s general case.
      return this.repository.transition(ride.id, RideStatus.MATCHING, undefined, tx);
    });
    if (!outcome.processed) {
      this.logger.log(`skipping duplicate delivery of ride.requested eventId=${eventId}`);
      return;
    }
    this.logger.log(`ride ${outcome.result.id} created and advanced to MATCHING`);
  }

  /** Consumes ride.cancelled (Phase 5). See cancel() for the guard applied. */
  async handleRideCancelled(rideId: string, reason: CancellationReason | undefined, eventId: string): Promise<void> {
    const outcome = await this.repository.runIdempotent(eventId, CONSUMER_NAME, (tx) => this.cancel(rideId, reason, tx));
    if (!outcome.processed) {
      this.logger.log(`skipping duplicate delivery of ride.cancelled eventId=${eventId}`);
      return;
    }
    this.logger.log(`ride ${rideId} cancelled via event`);
  }

  /**
   * Consumes driver.reserved (Dispatch Service winning a Redis reservation
   * for this ride). This only records the match (MATCHING -> MATCHED) — it
   * does NOT advance to DRIVER_ARRIVING. That's the driver's own explicit
   * decision now (see accept()/decline() below), not something Dispatch or
   * this consumer decides on the driver's behalf.
   */
  async handleDriverReserved(rideId: string, driverId: string, eventId: string): Promise<void> {
    const ride = await this.findById(rideId);
    this.guardTransition(ride.status, RideStatus.MATCHED);
    const outcome = await this.repository.runIdempotent(eventId, CONSUMER_NAME, (tx) =>
      this.repository.transition(rideId, RideStatus.MATCHED, { driverId }, tx),
    );
    if (!outcome.processed) {
      this.logger.log(`skipping duplicate delivery of driver.reserved eventId=${eventId}`);
      return;
    }
    this.logger.log(`ride ${rideId} matched with driver ${driverId}, awaiting driver accept`);
  }

  /** The driver's own explicit "Accept" tap — see MATCHED's own note in ride-state-machine.ts. */
  async accept(id: string): Promise<Ride> {
    return this.transitionTo(id, RideStatus.DRIVER_ARRIVING);
  }

  /** The driver's own explicit "Decline" tap — releases them back to AVAILABLE via cancel()'s own sync. */
  async decline(id: string): Promise<Ride> {
    return this.cancel(id, CancellationReason.DRIVER_CANCELLED);
  }

  /** Consumes driver.rejected (Phase 7): Dispatch exhausted every candidate. */
  async handleDriverRejected(rideId: string, eventId: string): Promise<void> {
    const outcome = await this.repository.runIdempotent(eventId, CONSUMER_NAME, (tx) =>
      this.cancel(rideId, CancellationReason.NO_DRIVERS_AVAILABLE, tx),
    );
    if (!outcome.processed) {
      this.logger.log(`skipping duplicate delivery of driver.rejected eventId=${eventId}`);
      return;
    }
    this.logger.log(`ride ${rideId} cancelled: no drivers available`);
  }

  async findById(id: string): Promise<Ride> {
    const ride = await this.repository.findById(id);
    if (!ride) {
      throw new NotFoundException(`Ride ${id} not found`);
    }
    return ride;
  }

  /** Polled by the driver dashboard — see findActiveByDriver's own note on why. */
  async findActiveForDriver(driverId: string): Promise<Ride | null> {
    return this.repository.findActiveByDriver(driverId);
  }

  async markDriverArrived(id: string): Promise<Ride> {
    return this.transitionTo(id, RideStatus.DRIVER_ARRIVED);
  }

  async start(id: string): Promise<Ride> {
    const ride = await this.transitionTo(id, RideStatus.IN_PROGRESS);
    if (ride.driverId) {
      await this.syncDriverStatusBestEffort(ride.driverId, DriverStatus.ON_TRIP);
    }
    return ride;
  }

  async complete(id: string): Promise<Ride> {
    const current = await this.findById(id);
    this.guardTransition(current.status, RideStatus.COMPLETED);
    const distanceKm = Math.round(haversineKm(current.pickup, current.destination) * 100) / 100;
    const fare = Math.round(BASE_FARE + PER_KM_RATE * distanceKm);
    const ride = await this.repository.transition(id, RideStatus.COMPLETED, { fare, distanceKm });
    if (ride.driverId) {
      await this.syncDriverStatusBestEffort(ride.driverId, DriverStatus.AVAILABLE);
    }
    return ride;
  }

  /** Booking-history list for a rider's profile/activity screen — most recent first, capped. */
  async findHistoryForRider(riderId: string, limit = DEFAULT_HISTORY_LIMIT): Promise<Ride[]> {
    return this.repository.findByRider(riderId, Math.min(Math.max(limit, 1), MAX_HISTORY_LIMIT));
  }

  /** Booking-history list for a driver's profile/activity screen — most recent first, capped. */
  async findHistoryForDriver(driverId: string, limit = DEFAULT_HISTORY_LIMIT): Promise<Ride[]> {
    return this.repository.findByDriver(driverId, Math.min(Math.max(limit, 1), MAX_HISTORY_LIMIT));
  }

  async cancel(id: string, reason: CancellationReason = CancellationReason.RIDER_CANCELLED, tx?: TripsTx): Promise<Ride> {
    const ride = await this.findById(id);
    this.guardTransition(ride.status, RideStatus.CANCELLED);
    const cancelled = await this.repository.transition(id, RideStatus.CANCELLED, { cancellationReason: reason }, tx);
    // A driver is only ever attached once matched (MATCHING has none), and
    // by the state machine above CANCELLED is only reachable from
    // MATCHING/MATCHED/DRIVER_ARRIVING/DRIVER_ARRIVED — never IN_PROGRESS —
    // so the driver, if any, is always still RESERVED here, never ON_TRIP.
    if (cancelled.driverId) {
      await this.syncDriverStatusBestEffort(cancelled.driverId, DriverStatus.AVAILABLE);
    }
    return cancelled;
  }

  /**
   * Mirrors dispatch-service's own best-effort sync (see its
   * syncDriverStatusBestEffort): driver-service's status is a durable
   * mirror, not the hot-path source of truth, so a failed PATCH here is
   * logged and swallowed rather than unwinding this ride's own transition —
   * real cross-service compensation/sagas are out of scope for this project.
   */
  private async syncDriverStatusBestEffort(driverId: string, status: DriverStatus): Promise<void> {
    try {
      const res = await fetch(`${this.driverServiceUrl}/drivers/${driverId}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        throw new Error(`driver-service rejected status sync for ${driverId}: HTTP ${res.status}`);
      }
    } catch (err) {
      this.logger.warn(`best-effort driver status sync to ${status} skipped for ${driverId}: ${(err as Error).message}`);
    }
  }

  private async transitionTo(id: string, to: RideStatus): Promise<Ride> {
    const ride = await this.findById(id);
    this.guardTransition(ride.status, to);
    return this.repository.transition(id, to);
  }

  private guardTransition(from: RideStatus, to: RideStatus): void {
    try {
      assertValidRideTransition(from, to);
    } catch (err) {
      if (err instanceof InvalidRideTransitionError) {
        throw new ConflictException(err.message);
      }
      throw err;
    }
  }
}
