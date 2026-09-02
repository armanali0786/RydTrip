import { create } from 'zustand';
import { DriverStatus, LocationPoint, Ride, RideRequestPayload } from '../types';
import { useAuthStore } from './useAuthStore';
import { wsClient } from '../websocket/client';
import { updateDriverLocation } from '../api/drivers';

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

// Real GPS isn't wired up yet (no device geolocation call) — this is only a
// starting map center, not a claim about where any specific driver is.
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
  // No trip-stats aggregation endpoint exists yet — start at zero and accrue
  // for real as completeTrip() fires, rather than pretending a day already happened.
  todaysTripsCount: 0,
  todaysEarnings: 0,

  setStatus: (status) => set({ status }),

  toggleOnline: () => {
    const nextStatus: DriverStatus = get().status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    set({ status: nextStatus, incomingRequest: null });
  },

  setCurrentLocation: (loc) => {
    set({ currentLocation: loc });
    const driver = useAuthStore.getState().user;
    if (get().status === 'ONLINE' && driver) {
      wsClient.send('driver.location.updated', {
        driverId: driver.id,
        location: loc,
      });
      // Real heartbeat to Location Service's Redis GEO index — without this,
      // going "online" never made a driver findable by GET /drivers/nearby.
      updateDriverLocation(driver.id, loc.latitude, loc.longitude).catch(() => {
        // Best-effort: a dropped ping just skips this tick's GEO refresh,
        // and the next one (a few seconds later) will retry.
      });
    }
  },

  setIncomingRequest: (incomingRequest) => set({ incomingRequest }),

  acceptRideRequest: () => {
    const req = get().incomingRequest;
    const driver = useAuthStore.getState().user;
    if (!req || !driver) return;

    const newTrip: Ride = {
      id: req.rideId,
      riderId: req.riderId,
      riderName: req.riderName,
      riderPhone: req.riderPhone,
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
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        // Vehicle make/model/color/plate and rating aren't tracked by
        // Driver Service yet (schema only has a vehicleType enum) — no
        // specifics to show beyond that.
        vehicleModel: 'Vehicle details not yet tracked',
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
