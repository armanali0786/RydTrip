import { create } from 'zustand';
import { DriverInfo, LocationPoint, Ride, RideStatus } from '../types';
import { wsClient } from '../websocket/client';

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
  history: [
    {
      id: 'ride_hist_01',
      riderId: 'rider_arman_01',
      riderName: 'Arman Ali',
      riderPhone: '+91 98765 43210',
      vehicleType: 'ECONOMY',
      pickup: { latitude: 17.44, longitude: 78.39, address: 'Inorbit Mall, Hyderabad' },
      destination: { latitude: 17.43, longitude: 78.44, address: 'Jubilee Hills Check Post, Hyderabad' },
      fare: 210,
      status: 'COMPLETED',
      distanceKm: 5.4,
      durationMins: 18,
      etaMinutes: 0,
      paymentMethod: 'MOCK_PAYMENT',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      driver: {
        id: 'driver_02',
        name: 'Vikram Singh',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        rating: 4.95,
        totalTrips: 1420,
        vehicleModel: 'Maruti Suzuki Swift Dzire',
        vehicleColor: 'White',
        licensePlate: 'TS 09 EA 4321',
        phone: '+91 98765 11111',
        currentLocation: { latitude: 17.43, longitude: 78.44, address: 'Jubilee Hills' },
      },
    },
  ],

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
