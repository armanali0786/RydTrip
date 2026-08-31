import { DriverStatus } from '@rydtrip/event-schema';
import { canTransitionDriverStatus } from './driver-state-machine';

describe('driver state machine', () => {
  const allStates = Object.values(DriverStatus);

  it.each([
    [DriverStatus.OFFLINE, DriverStatus.AVAILABLE],
    [DriverStatus.AVAILABLE, DriverStatus.OFFLINE],
    [DriverStatus.AVAILABLE, DriverStatus.RESERVED],
    [DriverStatus.RESERVED, DriverStatus.AVAILABLE],
    [DriverStatus.RESERVED, DriverStatus.ON_TRIP],
    [DriverStatus.ON_TRIP, DriverStatus.AVAILABLE],
    [DriverStatus.OFFLINE, DriverStatus.SUSPENDED],
    [DriverStatus.AVAILABLE, DriverStatus.SUSPENDED],
    [DriverStatus.SUSPENDED, DriverStatus.OFFLINE],
  ])('%s -> %s is valid', (from, to) => {
    expect(canTransitionDriverStatus(from, to)).toBe(true);
  });

  it.each([
    [DriverStatus.OFFLINE, DriverStatus.RESERVED],
    [DriverStatus.OFFLINE, DriverStatus.ON_TRIP],
    [DriverStatus.AVAILABLE, DriverStatus.ON_TRIP],
    [DriverStatus.ON_TRIP, DriverStatus.OFFLINE],
    [DriverStatus.ON_TRIP, DriverStatus.SUSPENDED],
    [DriverStatus.RESERVED, DriverStatus.SUSPENDED],
    [DriverStatus.RESERVED, DriverStatus.OFFLINE],
    [DriverStatus.SUSPENDED, DriverStatus.AVAILABLE],
    [DriverStatus.SUSPENDED, DriverStatus.RESERVED],
    [DriverStatus.SUSPENDED, DriverStatus.ON_TRIP],
  ])('%s -> %s is invalid', (from, to) => {
    expect(canTransitionDriverStatus(from, to)).toBe(false);
  });

  it('rejects every no-op self-transition', () => {
    for (const state of allStates) {
      expect(canTransitionDriverStatus(state, state)).toBe(false);
    }
  });
});
