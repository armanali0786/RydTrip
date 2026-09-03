import { create } from 'zustand';
import { DriverStatus, LocationPoint, Ride, RideStatus } from '../types';
import { useAuthStore } from './useAuthStore';
import { wsClient } from '../websocket/client';
import { BackendDriverStatus, getDriver, updateDriverLocation, updateDriverStatus } from '../api/drivers';
import {
  acceptTrip as apiAcceptTrip,
  declineTrip as apiDeclineTrip,
  BackendRideStatus,
  BackendTrip,
  completeTrip as apiCompleteTrip,
  getActiveTripForDriver,
  markDriverArrived as apiMarkDriverArrived,
  startTrip as apiStartTrip,
} from '../api/trips';
import { getRiderContact } from '../api/riders';
import { reverseGeocode } from '../api/geocoding';
import { calculateDistanceKm, estimateFare, mapDriverVehicleType } from '../api/rides';

// Driver Service's real status enum collapses onto this UI's 3-value one:
// RESERVED/ON_TRIP both read as "BUSY" here (no dedicated UI state for a
// driver who's been reserved but hasn't started the trip yet).
const BACKEND_TO_UI_STATUS: Record<BackendDriverStatus, DriverStatus> = {
  OFFLINE: 'OFFLINE',
  SUSPENDED: 'OFFLINE',
  AVAILABLE: 'ONLINE',
  RESERVED: 'BUSY',
  ON_TRIP: 'BUSY',
};

// MATCHED is a real, possibly long-lived state now: Dispatch Service only
// ever matches a driver (MATCHING -> MATCHED) — it's the driver's own
// explicit accept/decline (see acceptTrip/declineTrip below) that moves a
// ride past that point, so MATCHED must stay distinct rather than being
// folded into DRIVER_ARRIVING.
const BACKEND_TO_UI_RIDE_STATUS: Partial<Record<BackendRideStatus, RideStatus>> = {
  MATCHED: 'MATCHED',
  DRIVER_ARRIVING: 'DRIVER_ARRIVING',
  DRIVER_ARRIVED: 'DRIVER_ARRIVED',
  IN_PROGRESS: 'IN_PROGRESS',
};

interface DriverStoreState {
  status: DriverStatus;
  currentLocation: LocationPoint;
  activeTrip: Ride | null;
  todaysTripsCount: number;
  todaysEarnings: number;

  setStatus: (status: DriverStatus) => void;
  syncStatusFromBackend: (driverId: string) => Promise<void>;
  toggleOnline: () => Promise<void>;
  setCurrentLocation: (loc: LocationPoint) => void;
  pollActiveTrip: (driverId: string) => Promise<void>;
  acceptTrip: () => Promise<void>;
  declineTrip: () => Promise<void>;
  arriveAtPickup: () => Promise<void>;
  startTrip: () => Promise<void>;
  completeTrip: () => Promise<void>;
}

// Real GPS isn't wired up yet (no device geolocation call) — this is only a
// starting map center, not a claim about where any specific driver is.
export const INITIAL_DRIVER_LOCATION: LocationPoint = {
  latitude: 17.442,
  longitude: 78.385,
  address: 'Madhapur Main Road, Hyderabad',
  name: 'Madhapur',
};

function describeCoords(latitude: number, longitude: number): LocationPoint {
  return { latitude, longitude, address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` };
}

export const useDriverStore = create<DriverStoreState>((set, get) => ({
  // Defaults OFFLINE until syncStatusFromBackend confirms otherwise — a
  // driver used to always start "ONLINE" in the UI regardless of the DB row.
  status: 'OFFLINE',
  currentLocation: INITIAL_DRIVER_LOCATION,
  activeTrip: null,
  // No trip-stats aggregation endpoint exists yet — start at zero and accrue
  // for real as completeTrip() fires, rather than pretending a day already happened.
  todaysTripsCount: 0,
  todaysEarnings: 0,

  setStatus: (status) => set({ status }),

  syncStatusFromBackend: async (driverId) => {
    try {
      const driver = await getDriver(driverId);
      set({ status: BACKEND_TO_UI_STATUS[driver.status] ?? 'OFFLINE' });
    } catch {
      // Best-effort: keep the current (default OFFLINE) state if the fetch fails.
    }
  },

  toggleOnline: async () => {
    const current = get().status;
    // Status is driven by the trip lifecycle (see pollActiveTrip/completeTrip)
    // while on a trip — the toggle button can't override that.
    if (current === 'BUSY') return;

    const driver = useAuthStore.getState().user;
    if (!driver) return;

    const nextStatus: DriverStatus = current === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    const backendStatus: BackendDriverStatus = nextStatus === 'ONLINE' ? 'AVAILABLE' : 'OFFLINE';

    try {
      await updateDriverStatus(driver.id, backendStatus);
      set({ status: nextStatus });
    } catch {
      // Backend rejected the transition (e.g. stale local state) — leave
      // the UI as-is rather than show a status the DB doesn't actually have.
    }
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

  /**
   * The real replacement for the old fake "incoming request" popup: this
   * poll is how a driver actually discovers Dispatch Service matched them
   * to a ride (there's no real-time push transport), and how activeTrip
   * stays in sync with reality (e.g. cleared if the rider cancels while
   * still MATCHED, or if this driver declines from another session).
   */
  pollActiveTrip: async (driverId) => {
    let trip: BackendTrip | null;
    try {
      trip = await getActiveTripForDriver(driverId);
    } catch {
      return; // Best-effort poll — try again next tick.
    }

    const localTrip = get().activeTrip;

    if (!trip) {
      if (localTrip) {
        // Completed/cancelled elsewhere (or the reservation lapsed) — drop
        // it and re-sync the real driver status rather than assume ONLINE.
        set({ activeTrip: null });
        await get().syncStatusFromBackend(driverId);
      }
      return;
    }

    const status = BACKEND_TO_UI_RIDE_STATUS[trip.status];
    if (!status) return; // REQUESTED/MATCHING: not yet actually assigned to this driver.

    if (localTrip && localTrip.id === trip.id) {
      if (localTrip.status !== status) {
        const updated = { ...localTrip, status };
        set({ activeTrip: updated });
        wsClient.send('ride.status.changed', { rideId: trip.id, status, ride: updated });
      }
      return;
    }

    // Newly discovered assignment — hydrate full display details (address
    // text, rider contact, an estimated fare) that trip-service itself
    // doesn't store.
    const driver = useAuthStore.getState().user;
    if (!driver) return;

    const pickupCoords = describeCoords(trip.pickup.lat, trip.pickup.lng);
    const destCoords = describeCoords(trip.destination.lat, trip.destination.lng);
    const [pickupAddress, destAddress, riderContact] = await Promise.all([
      reverseGeocode(pickupCoords.latitude, pickupCoords.longitude),
      reverseGeocode(destCoords.latitude, destCoords.longitude),
      getRiderContact(trip.riderId).catch(() => null),
    ]);

    const vehicleType = mapDriverVehicleType(driver.vehicleType);
    const distanceKm = calculateDistanceKm(pickupCoords, destCoords);

    const newTrip: Ride = {
      id: trip.id,
      riderId: trip.riderId,
      riderName: riderContact?.name ?? 'Rider',
      riderPhone: riderContact?.phone ?? '',
      vehicleType,
      pickup: { ...pickupCoords, address: pickupAddress ?? pickupCoords.address },
      destination: { ...destCoords, address: destAddress ?? destCoords.address },
      fare: estimateFare(vehicleType, distanceKm),
      status,
      distanceKm,
      durationMins: Math.round(distanceKm * 2.5),
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

    set({ activeTrip: newTrip, status: 'BUSY' });
    wsClient.send('driver.assigned', { rideId: trip.id, driver: newTrip.driver });
    wsClient.send('ride.status.changed', { rideId: trip.id, status, ride: newTrip });
  },

  acceptTrip: async () => {
    const trip = get().activeTrip;
    if (!trip || trip.status !== 'MATCHED') return;
    try {
      await apiAcceptTrip(trip.id);
    } catch {
      return; // Backend rejected it (stale state) — next poll reconciles.
    }
    const updated = { ...trip, status: 'DRIVER_ARRIVING' as const };
    set({ activeTrip: updated });
    wsClient.send('driver.assigned', { rideId: trip.id, driver: updated.driver });
    wsClient.send('ride.status.changed', { rideId: trip.id, status: 'DRIVER_ARRIVING', ride: updated });
  },

  declineTrip: async () => {
    const trip = get().activeTrip;
    const driver = useAuthStore.getState().user;
    if (!trip || trip.status !== 'MATCHED' || !driver) return;
    try {
      await apiDeclineTrip(trip.id);
    } catch {
      return;
    }
    set({ activeTrip: null });
    await get().syncStatusFromBackend(driver.id);
    wsClient.send('ride.status.changed', { rideId: trip.id, status: 'CANCELLED' });
  },

  arriveAtPickup: async () => {
    const trip = get().activeTrip;
    if (!trip) return;
    try {
      await apiMarkDriverArrived(trip.id);
    } catch {
      return; // Backend rejected it (stale state) — next poll reconciles.
    }
    const updated = { ...trip, status: 'DRIVER_ARRIVED' as const };
    set({ activeTrip: updated });
    wsClient.send('ride.status.changed', { rideId: trip.id, status: 'DRIVER_ARRIVED', ride: updated });
  },

  startTrip: async () => {
    const trip = get().activeTrip;
    if (!trip) return;
    try {
      await apiStartTrip(trip.id);
    } catch {
      return;
    }
    const updated = { ...trip, status: 'IN_PROGRESS' as const };
    set({ activeTrip: updated });
    wsClient.send('ride.status.changed', { rideId: trip.id, status: 'IN_PROGRESS', ride: updated });
  },

  completeTrip: async () => {
    const trip = get().activeTrip;
    const driver = useAuthStore.getState().user;
    if (!trip || !driver) return;
    try {
      await apiCompleteTrip(trip.id);
    } catch {
      return;
    }

    set((state) => ({
      activeTrip: null,
      todaysTripsCount: state.todaysTripsCount + 1,
      todaysEarnings: state.todaysEarnings + trip.fare,
    }));
    // trip-service just released the driver back to AVAILABLE — reflect it.
    await get().syncStatusFromBackend(driver.id);

    wsClient.send('trip.completed', { rideId: trip.id, fare: trip.fare });
    wsClient.send('ride.status.changed', { rideId: trip.id, status: 'COMPLETED' });
  },
}));
