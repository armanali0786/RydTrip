import { create } from 'zustand';
import { DriverInfo, LocationPoint, Ride, RideStatus } from '../types';

interface RideStoreState {
  activeRide: Ride | null;
  driverLocation: LocationPoint | null;
  history: Ride[];

  setActiveRide: (ride: Ride | null) => void;
  updateRideStatus: (status: RideStatus) => void;
  assignDriver: (driver: DriverInfo) => void;
  updateDriverLocation: (loc: LocationPoint) => void;
  cancelActiveRide: () => void;
  resetRide: () => void;
}

export const useRideStore = create<RideStoreState>((set, get) => ({
  activeRide: null,
  driverLocation: null,
  // No GET /riders/:id/rides endpoint exists yet (Rider Service only supports
  // creating/cancelling rides today), so there's no real history to fetch —
  // this starts empty rather than showing a fabricated past ride.
  history: [],

  setActiveRide: (ride) => {
    set({
      activeRide: ride,
      driverLocation: ride?.driver?.currentLocation || null,
    });
  },

  updateRideStatus: (status) => {
    const current = get().activeRide;
    if (!current) return;

    const updated = { ...current, status, updatedAt: new Date().toISOString() };
    set({ activeRide: updated });

    if (status === 'COMPLETED') {
      set((state) => ({
        history: [updated, ...state.history],
      }));
    }
  },

  assignDriver: (driver) => {
    const current = get().activeRide;
    if (!current) return;

    const updated: Ride = {
      ...current,
      driver,
      status: 'MATCHED',
      updatedAt: new Date().toISOString(),
    };
    set({
      activeRide: updated,
      driverLocation: driver.currentLocation,
    });
  },

  updateDriverLocation: (loc) => {
    set({ driverLocation: loc });
  },

  cancelActiveRide: () => {
    const current = get().activeRide;
    if (current) {
      const cancelled: Ride = { ...current, status: 'CANCELLED', updatedAt: new Date().toISOString() };
      set((state) => ({
        activeRide: cancelled,
        history: [cancelled, ...state.history],
      }));
    }
  },

  resetRide: () => set({ activeRide: null, driverLocation: null }),
}));
