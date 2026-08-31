import { create } from 'zustand';
import { DriverStatus, LocationPoint, Ride, RideRequestPayload } from '../types';
import { wsClient } from '../websocket/client';

interface DriverStoreState {
  status: DriverStatus;
  currentLocation: LocationPoint;
  incomingRequest: RideRequestPayload | null;
  activeTrip: Ride | null;
  todaysTripsCount: number;
  todaysEarnings: number;

  setStatus: (status: DriverStatus) => void;
  toggleOnline: () => void;
  setCurrentLocation: (loc: LocationPoint) => void;
  setIncomingRequest: (req: RideRequestPayload | null) => void;
  acceptRideRequest: () => void;
  rejectRideRequest: () => void;
  arriveAtPickup: () => void;
  startTrip: () => void;
  completeTrip: () => void;
}

export const INITIAL_DRIVER_LOCATION: LocationPoint = {
  latitude: 17.442,
  longitude: 78.385,
  address: 'Madhapur Main Road, Hyderabad',
  name: 'Madhapur',
};

export const useDriverStore = create<DriverStoreState>((set, get) => ({
  status: 'ONLINE',
  currentLocation: INITIAL_DRIVER_LOCATION,
  incomingRequest: null,
  activeTrip: null,
  todaysTripsCount: 8,
  todaysEarnings: 2840,

  setStatus: (status) => set({ status }),

  toggleOnline: () => {
    const nextStatus: DriverStatus = get().status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    set({ status: nextStatus, incomingRequest: null });
  },

  setCurrentLocation: (loc) => {
    set({ currentLocation: loc });
    if (get().status === 'ONLINE') {
      wsClient.send('driver.location.updated', {
        driverId: 'driver_rahul_01',
        location: loc,
      });
    }
  },

  setIncomingRequest: (incomingRequest) => set({ incomingRequest }),

  acceptRideRequest: () => {
    const req = get().incomingRequest;
    if (!req) return;

    const newTrip: Ride = {
      id: req.rideId,
      riderId: 'rider_arman_01',
      riderName: req.riderName,
      riderPhone: '+91 98765 43210',
      vehicleType: req.vehicleType,
      pickup: req.pickup,
      destination: req.destination,
      fare: req.fare,
      status: 'DRIVER_ARRIVING',
      distanceKm: req.distanceKm,
      durationMins: Math.round(req.distanceKm * 2.5),
      etaMinutes: 4,
      paymentMethod: 'MOCK_PAYMENT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      driver: {
        id: 'driver_rahul_01',
        name: 'Rahul Sharma',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        rating: 4.88,
        totalTrips: 1240,
        vehicleModel: 'Toyota Camry Hybrid',
        vehicleColor: 'Black',
        licensePlate: 'TS 07 EQ 9999',
        phone: '+91 91234 56789',
        currentLocation: get().currentLocation,
      },
    };

    set({
      activeTrip: newTrip,
      incomingRequest: null,
      status: 'BUSY',
    });

    wsClient.send('driver.assigned', {
      rideId: req.rideId,
      driver: newTrip.driver,
    });

    wsClient.send('ride.status.changed', {
      rideId: req.rideId,
      status: 'MATCHED',
      ride: newTrip,
    });
  },

  rejectRideRequest: () => {
    set({ incomingRequest: null });
  },

  arriveAtPickup: () => {
    const trip = get().activeTrip;
    if (!trip) return;

    const updated = { ...trip, status: 'DRIVER_ARRIVED' as const };
    set({ activeTrip: updated });

    wsClient.send('ride.status.changed', {
      rideId: trip.id,
      status: 'DRIVER_ARRIVED',
    });
  },

  startTrip: () => {
    const trip = get().activeTrip;
    if (!trip) return;

    const updated = { ...trip, status: 'IN_PROGRESS' as const };
    set({ activeTrip: updated });

    wsClient.send('trip.started', {
      rideId: trip.id,
      status: 'IN_PROGRESS',
    });
    wsClient.send('ride.status.changed', {
      rideId: trip.id,
      status: 'IN_PROGRESS',
    });
  },

  completeTrip: () => {
    const trip = get().activeTrip;
    if (!trip) return;

    const updated = { ...trip, status: 'COMPLETED' as const };

    set((state) => ({
      activeTrip: null,
      status: 'ONLINE',
      todaysTripsCount: state.todaysTripsCount + 1,
      todaysEarnings: state.todaysEarnings + trip.fare,
    }));

    wsClient.send('trip.completed', {
      rideId: trip.id,
      fare: trip.fare,
    });
    wsClient.send('ride.status.changed', {
      rideId: trip.id,
      status: 'COMPLETED',
    });
  },
}));
