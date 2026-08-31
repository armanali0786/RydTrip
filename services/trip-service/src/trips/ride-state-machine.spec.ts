import { RideStatus } from '@rydtrip/event-schema';
import { canTransitionRideStatus } from './ride-state-machine';

const ALL_STATES = Object.values(RideStatus);

const VALID_TRANSITIONS: [RideStatus, RideStatus][] = [
  [RideStatus.REQUESTED, RideStatus.MATCHING],
  [RideStatus.MATCHING, RideStatus.MATCHED],
  [RideStatus.MATCHING, RideStatus.CANCELLED],
  [RideStatus.MATCHED, RideStatus.DRIVER_ARRIVING],
  [RideStatus.DRIVER_ARRIVING, RideStatus.DRIVER_ARRIVED],
  [RideStatus.DRIVER_ARRIVING, RideStatus.CANCELLED],
  [RideStatus.DRIVER_ARRIVED, RideStatus.IN_PROGRESS],
  [RideStatus.DRIVER_ARRIVED, RideStatus.CANCELLED],
  [RideStatus.IN_PROGRESS, RideStatus.COMPLETED],
];

describe('ride state machine', () => {
  it.each(VALID_TRANSITIONS)('%s -> %s is valid', (from, to) => {
    expect(canTransitionRideStatus(from, to)).toBe(true);
  });

  it('IN_PROGRESS -> CANCELLED is explicitly invalid', () => {
    expect(canTransitionRideStatus(RideStatus.IN_PROGRESS, RideStatus.CANCELLED)).toBe(false);
  });

  it('REQUESTED -> CANCELLED is invalid (must reach MATCHING first)', () => {
    expect(canTransitionRideStatus(RideStatus.REQUESTED, RideStatus.CANCELLED)).toBe(false);
  });

  it('COMPLETED and CANCELLED are terminal — no transitions out', () => {
    for (const to of ALL_STATES) {
      expect(canTransitionRideStatus(RideStatus.COMPLETED, to)).toBe(false);
      expect(canTransitionRideStatus(RideStatus.CANCELLED, to)).toBe(false);
    }
  });

  it('rejects every no-op self-transition', () => {
    for (const state of ALL_STATES) {
      expect(canTransitionRideStatus(state, state)).toBe(false);
    }
  });

  it('every valid transition pair is exactly the allow-listed set (no unexpected extras)', () => {
    const actualValidPairs = new Set<string>();
    for (const from of ALL_STATES) {
      for (const to of ALL_STATES) {
        if (canTransitionRideStatus(from, to)) {
          actualValidPairs.add(`${from}->${to}`);
        }
      }
    }
    const expectedValidPairs = new Set(VALID_TRANSITIONS.map(([from, to]) => `${from}->${to}`));
    expect(actualValidPairs).toEqual(expectedValidPairs);
  });
});
