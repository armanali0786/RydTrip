import { RideStatus } from '@rydtrip/event-schema';

/**
 * Exhaustive transition table from docs/architecture/state-machines.md.
 * Notably: IN_PROGRESS -> CANCELLED is NOT valid (see that doc for why).
 * MATCHED -> DRIVER_ARRIVING is the driver's own explicit accept
 * (POST /trips/:id/accept, see trips.service.ts's accept()) — Dispatch
 * Service only ever gets a ride to MATCHED, never past it; MATCHED ->
 * CANCELLED is the driver's decline (POST /trips/:id/decline) or a rider
 * cancelling before the driver has decided.
 */
const ALLOWED_TRANSITIONS: Record<RideStatus, RideStatus[]> = {
  [RideStatus.REQUESTED]: [RideStatus.MATCHING],
  [RideStatus.MATCHING]: [RideStatus.MATCHED, RideStatus.CANCELLED],
  [RideStatus.MATCHED]: [RideStatus.DRIVER_ARRIVING, RideStatus.CANCELLED],
  [RideStatus.DRIVER_ARRIVING]: [RideStatus.DRIVER_ARRIVED, RideStatus.CANCELLED],
  [RideStatus.DRIVER_ARRIVED]: [RideStatus.IN_PROGRESS, RideStatus.CANCELLED],
  [RideStatus.IN_PROGRESS]: [RideStatus.COMPLETED],
  [RideStatus.COMPLETED]: [],
  [RideStatus.CANCELLED]: [],
};

export function canTransitionRideStatus(from: RideStatus, to: RideStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export class InvalidRideTransitionError extends Error {
  constructor(
    public readonly from: RideStatus,
    public readonly to: RideStatus,
  ) {
    super(`Invalid ride status transition: ${from} -> ${to}`);
    this.name = 'InvalidRideTransitionError';
  }
}

export function assertValidRideTransition(from: RideStatus, to: RideStatus): void {
  if (!canTransitionRideStatus(from, to)) {
    throw new InvalidRideTransitionError(from, to);
  }
}
