import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CancellationReason, Ride, RideStatus } from '@ridemesh/event-schema';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import type { Ride as RideRow } from '../../prisma-client';

function toDomain(row: RideRow): Ride {
  return {
    id: row.id,
    riderId: row.riderId,
    driverId: row.driverId ?? undefined,
    pickup: { lat: row.pickupLat, lng: row.pickupLng },
    destination: { lat: row.destinationLat, lng: row.destinationLng },
    status: row.status as RideStatus,
    cancellationReason: (row.cancellationReason as CancellationReason | null) ?? undefined,
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

  async create(dto: CreateTripDto): Promise<Ride> {
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.ride.create({
        data: {
          riderId: dto.riderId,
          pickupLat: dto.pickup.lat,
          pickupLng: dto.pickup.lng,
          destinationLat: dto.destination.lat,
          destinationLng: dto.destination.lng,
          status: RideStatus.REQUESTED,
        },
      });
      await tx.tripEvent.create({
        data: {
          rideId: created.id,
          eventType: eventTypeForStatus(RideStatus.REQUESTED),
          eventId: randomUUID(),
        },
      });
      return created;
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<Ride | null> {
    const row = await this.prisma.ride.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  /** Updates ride status and appends the trip_events audit row atomically. */
  async transition(
    id: string,
    to: RideStatus,
    options?: { cancellationReason?: CancellationReason },
  ): Promise<Ride> {
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.ride.update({
        where: { id },
        data: {
          status: to,
          ...(options?.cancellationReason ? { cancellationReason: options.cancellationReason } : {}),
        },
      });
      await tx.tripEvent.create({
        data: {
          rideId: id,
          eventType: eventTypeForStatus(to),
          eventId: randomUUID(),
          metadata: options?.cancellationReason ? { cancellationReason: options.cancellationReason } : undefined,
        },
      });
      return updated;
    });
    return toDomain(row);
  }
}
