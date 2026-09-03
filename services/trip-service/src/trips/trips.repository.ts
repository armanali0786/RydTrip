import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CancellationReason, GeoPoint, Ride, RideStatus } from '@rydtrip/event-schema';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../prisma-client';
import type { Ride as RideRow } from '../../prisma-client';

/** The Prisma client type available inside a `$transaction` callback. */
export type TripsTx = Prisma.TransactionClient;

export type IdempotentOutcome<T> = { processed: false } | { processed: true; result: T };

export interface CreateRideInput {
  /** Provided by the ride.requested event's payload — Rider Service, not this repository, mints the id. */
  id: string;
  riderId: string;
  pickup: GeoPoint;
  destination: GeoPoint;
}

function toDomain(row: RideRow): Ride {
  return {
    id: row.id,
    riderId: row.riderId,
    driverId: row.driverId ?? undefined,
    pickup: { lat: row.pickupLat, lng: row.pickupLng },
    destination: { lat: row.destinationLat, lng: row.destinationLng },
    status: row.status as RideStatus,
    cancellationReason: (row.cancellationReason as CancellationReason | null) ?? undefined,
    fare: row.fare ?? undefined,
    distanceKm: row.distanceKm ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Descriptive labels for the trip_events audit trail. Where a Phase 5+
 * Kafka topic already has a settled name (see docs/architecture/overview.md),
 * reuse it so the log reads consistently once events are wired up for real.
 */
function eventTypeForStatus(status: RideStatus): string {
  switch (status) {
    case RideStatus.REQUESTED:
      return 'ride.requested';
    case RideStatus.MATCHING:
      return 'ride.matching';
    case RideStatus.MATCHED:
      return 'ride.matched';
    case RideStatus.DRIVER_ARRIVING:
      return 'driver.arriving';
    case RideStatus.DRIVER_ARRIVED:
      return 'driver.arrived';
    case RideStatus.IN_PROGRESS:
      return 'trip.started';
    case RideStatus.COMPLETED:
      return 'trip.completed';
    case RideStatus.CANCELLED:
      return 'ride.cancelled';
    default:
      return status;
  }
}

@Injectable()
export class TripsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs `work` inside a transaction guarded by a `processed_events` insert
   * for (eventId, consumerName) — the insert happens first, so if this
   * (eventId, consumerName) pair was already processed the unique
   * constraint on `processed_events` throws, the whole transaction (side
   * effects included) rolls back untouched, and this returns
   * `{ processed: false }` instead of re-running `work`. This is what makes
   * replaying the same Kafka event N times produce exactly one business
   * side effect (Phase 8) — the guard and the side effect commit or roll
   * back together, not as two separate writes that could race or half-apply.
   */
  async runIdempotent<T>(eventId: string, consumerName: string, work: (tx: TripsTx) => Promise<T>): Promise<IdempotentOutcome<T>> {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        await tx.processedEvent.create({ data: { eventId, consumerName } });
        return work(tx);
      });
      return { processed: true, result };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return { processed: false };
      }
      throw err;
    }
  }

  async create(input: CreateRideInput, tx?: TripsTx): Promise<Ride> {
    const exec = async (client: TripsTx | PrismaService) => {
      const created = await client.ride.create({
        data: {
          id: input.id,
          riderId: input.riderId,
          pickupLat: input.pickup.lat,
          pickupLng: input.pickup.lng,
          destinationLat: input.destination.lat,
          destinationLng: input.destination.lng,
          status: RideStatus.REQUESTED,
        },
      });
      await client.tripEvent.create({
        data: {
          rideId: created.id,
          eventType: eventTypeForStatus(RideStatus.REQUESTED),
          eventId: randomUUID(),
        },
      });
      return created;
    };
    const row = tx ? await exec(tx) : await this.prisma.$transaction((innerTx) => exec(innerTx));
    return toDomain(row);
  }

  async findById(id: string): Promise<Ride | null> {
    const row = await this.prisma.ride.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  /**
   * The driver dashboard's only way to learn Dispatch Service assigned it a
   * ride — polled, since no real-time push transport exists yet (see
   * docs/roadmap). "Active" excludes COMPLETED/CANCELLED; the most recent
   * match (there's normally at most one) wins if somehow more than one ride
   * still references this driver.
   */
  async findActiveByDriver(driverId: string): Promise<Ride | null> {
    const row = await this.prisma.ride.findFirst({
      where: { driverId, status: { notIn: [RideStatus.COMPLETED, RideStatus.CANCELLED] } },
      orderBy: { createdAt: 'desc' },
    });
    return row ? toDomain(row) : null;
  }

  /** Booking-history list for a rider's profile/activity screen — most recent first. */
  async findByRider(riderId: string, limit: number): Promise<Ride[]> {
    const rows = await this.prisma.ride.findMany({
      where: { riderId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(toDomain);
  }

  /** Booking-history list for a driver's profile/activity screen — most recent first. */
  async findByDriver(driverId: string, limit: number): Promise<Ride[]> {
    const rows = await this.prisma.ride.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map(toDomain);
  }

  /**
   * Raw otp lookup — deliberately bypasses toDomain()/the Ride type so the
   * code never accidentally rides along with a general ride fetch. Used
   * only by TripsService.start() (validation) and getOtpForRider()
   * (the one endpoint allowed to expose it to a client).
   */
  async getOtp(id: string): Promise<string | null> {
    const row = await this.prisma.ride.findUnique({ where: { id }, select: { otp: true } });
    return row?.otp ?? null;
  }

  /** Updates ride status and appends the trip_events audit row atomically. */
  async transition(
    id: string,
    to: RideStatus,
    options?: {
      cancellationReason?: CancellationReason;
      driverId?: string;
      fare?: number;
      distanceKm?: number;
      otp?: string;
      clearOtp?: boolean;
    },
    tx?: TripsTx,
  ): Promise<Ride> {
    const exec = async (client: TripsTx | PrismaService) => {
      const updated = await client.ride.update({
        where: { id },
        data: {
          status: to,
          ...(options?.cancellationReason ? { cancellationReason: options.cancellationReason } : {}),
          ...(options?.driverId ? { driverId: options.driverId } : {}),
          ...(options?.fare !== undefined ? { fare: options.fare } : {}),
          ...(options?.distanceKm !== undefined ? { distanceKm: options.distanceKm } : {}),
          ...(options?.otp !== undefined ? { otp: options.otp } : {}),
          ...(options?.clearOtp ? { otp: null } : {}),
        },
      });
      await client.tripEvent.create({
        data: {
          rideId: id,
          eventType: eventTypeForStatus(to),
          eventId: randomUUID(),
          metadata: options?.cancellationReason ? { cancellationReason: options.cancellationReason } : undefined,
        },
      });
      return updated;
    };
    const row = tx ? await exec(tx) : await this.prisma.$transaction((innerTx) => exec(innerTx));
    return toDomain(row);
  }
}
