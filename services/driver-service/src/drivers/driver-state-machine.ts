import { DriverStatus } from '@ridemesh/event-schema';

/**
 * Exhaustive transition table from docs/architecture/state-machines.md.
 * Anything not listed here is invalid — including no-op self-transitions.
 */
const ALLOWED_TRANSITIONS: Record<DriverStatus, DriverStatus[]> = {
  [DriverStatus.OFFLINE]: [DriverStatus.AVAILABLE, DriverStatus.SUSPENDED],
  [DriverStatus.AVAILABLE]: [DriverStatus.OFFLINE, DriverStatus.RESERVED, DriverStatus.SUSPENDED],
  [DriverStatus.RESERVED]: [DriverStatus.AVAILABLE, DriverStatus.ON_TRIP],
  [DriverStatus.ON_TRIP]: [DriverStatus.AVAILABLE],
  [DriverStatus.SUSPENDED]: [DriverStatus.OFFLINE],
};

export function canTransitionDriverStatus(from: DriverStatus, to: DriverStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export class InvalidDriverTransitionError extends Error {
  constructor(
    public readonly from: DriverStatus,
    public readonly to: DriverStatus,
  ) {
    super(`Invalid driver status transition: ${from} -> ${to}`);
    this.name = 'InvalidDriverTransitionError';
  }
}

export function assertValidDriverTransition(from: DriverStatus, to: DriverStatus): void {
  if (!canTransitionDriverStatus(from, to)) {
    throw new InvalidDriverTransitionError(from, to);
  }
}
