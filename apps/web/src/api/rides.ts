import { LocationPoint, Ride, VehicleOption, VehicleType } from '../types';
import { apiFetch } from './client';
import { wsClient } from '../websocket/client';

export interface CreateRideRequest {
  riderId: string;
  riderName: string;
  riderPhone: string;
  pickup: LocationPoint;
  destination: LocationPoint;
  vehicleType: VehicleType;
  paymentMethod: 'CASH' | 'MOCK_PAYMENT';
  /** Real ETA of the nearby driver found for this pickup (see findNearbyVehicle). */
  etaMinutes: number;
}

// Backend's real accepted shape (services/rider-service/src/rides/dto/*.ts):
// POST /rides { riderId: uuid, pickup: {lat,lng}, destination: {lat,lng} } -> 202 { rideId, status }
interface BackendCreateRideResponse {
  rideId: string;
  status: string;
}

// Cosmetic display metadata per category (name/image/capacity/tagline/base
// fare) — there's no pricing-service, so a base fare is still a client-side
// stand-in. What's no longer fake: *which* category is shown, and its ETA —
// both now come from a real nearby driver (see findNearbyVehicle below)
// instead of always listing all four regardless of who's actually online.
const VEHICLE_METADATA: Record<VehicleType, Omit<VehicleOption, 'type' | 'eta'>> = {
  ECONOMY: {
    name: 'RydTrip Go',
    capacity: 4,
    fare: 240,
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=150&auto=format&fit=crop&q=80',
    tagline: 'Affordable, compact rides',
  },
  PREMIUM: {
    name: 'RydTrip Premier',
    capacity: 4,
    fare: 390,
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=150&auto=format&fit=crop&q=80',
    tagline: 'Comfortable sedans with top-rated drivers',
  },
  AUTO: {
    name: 'RydTrip Auto',
    capacity: 3,
    fare: 140,
    image: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=150&auto=format&fit=crop&q=80',
    tagline: 'No haggling, auto at your doorstep',
  },
  MOTO: {
    name: 'RydTrip Moto',
    capacity: 1,
    fare: 80,
    image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=150&auto=format&fit=crop&q=80',
    tagline: 'Quick bike rides, beat the traffic',
  },
  XL: {
    name: 'RydTrip XL',
    capacity: 6,
    fare: 550,
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=150&auto=format&fit=crop&q=80',
    tagline: 'Spacious SUVs for group travel',
  },
};

// Maps Driver Service's stored vehicleType (see create-driver.dto.ts) to this
// app's rider-facing category.
const DRIVER_VEHICLE_TYPE_MAP: Record<string, VehicleType> = {
  HATCHBACK: 'ECONOMY',
  SEDAN: 'PREMIUM',
  SUV: 'XL',
  AUTO: 'AUTO',
  BIKE: 'MOTO',
};

interface NearbyDriverResult {
  driverId: string;
  lat: number;
  lng: number;
  distanceKm: number;
}

async function fetchNearbyDrivers(pickup: LocationPoint, radiusKm: number): Promise<NearbyDriverResult[]> {
  const params = new URLSearchParams({
    lat: String(pickup.latitude),
    lng: String(pickup.longitude),
    radiusKm: String(radiusKm),
    limit: '1',
  });
  const res = await apiFetch<{ drivers: NearbyDriverResult[] }>(`/drivers/nearby?${params}`);
  return res.drivers;
}

export interface OnlineDriverLocation {
  driverId: string;
  lat: number;
  lng: number;
}

/**
 * No reference point needed — any currently-online driver, picked
 * arbitrarily by Location Service's Redis GEO set. Used to seed a real
 * pickup point (instead of a hardcoded city) when the browser has no
 * geolocation permission/support.
 */
export async function findAnyOnlineDriver(): Promise<OnlineDriverLocation | null> {
  const res = await apiFetch<{ drivers: OnlineDriverLocation[] }>('/drivers/any-online?limit=1');
  return res.drivers[0] ?? null;
}

export interface NearbyVehicleEstimate {
  option: VehicleOption;
  driverId: string;
  driverDistanceKm: number;
}

/**
 * The real replacement for the old static 4-option list: finds the single
 * actual nearest online driver (Location Service's Redis GEO index) and
 * builds one vehicle card from their real vehicle type and real distance —
 * not a fabricated category/eta. Widens the search radius once before
 * concluding no one is online nearby. Fare still uses the client-side
 * distance formula (no pricing-service exists yet).
 */
export async function findNearbyVehicle(pickup: LocationPoint): Promise<NearbyVehicleEstimate | null> {
  let drivers = await fetchNearbyDrivers(pickup, 10);
  if (drivers.length === 0) {
    drivers = await fetchNearbyDrivers(pickup, 50);
  }
  if (drivers.length === 0) {
    return null;
  }

  const nearest = drivers[0];
  const { vehicleType } = await apiFetch<{ vehicleType: string }>(`/drivers/${nearest.driverId}/vehicle`);
  const type = DRIVER_VEHICLE_TYPE_MAP[vehicleType] ?? 'ECONOMY';
  const meta = VEHICLE_METADATA[type];
  const etaMinutes = Math.max(1, Math.round((nearest.distanceKm / 25) * 60));

  return {
    option: { type, eta: etaMinutes, ...meta },
    driverId: nearest.driverId,
    driverDistanceKm: nearest.distanceKm,
  };
}

// Shared with useDriverStore's real-trip hydration (see pollActiveTrip) —
// the assigned driver's own vehicleType/distance drive the same client-side
// fare estimate a rider sees, since no pricing-service exists to compute
// (or store) a real one.
export function mapDriverVehicleType(rawVehicleType: string | undefined): VehicleType {
  return DRIVER_VEHICLE_TYPE_MAP[rawVehicleType ?? ''] ?? 'ECONOMY';
}

export function estimateFare(vehicleType: VehicleType, distanceKm: number): number {
  const meta = VEHICLE_METADATA[vehicleType] ?? VEHICLE_METADATA.ECONOMY;
  return Math.round(meta.fare + distanceKm * 15);
}

// Helper to calculate distance in KM between 2 points
export function calculateDistanceKm(p1: LocationPoint, p2: LocationPoint): number {
  const R = 6371; // Earth radius in km
  const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
  const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.latitude * Math.PI) / 180) *
      Math.cos((p2.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10 || 4.2;
}

// There is no real dispatch/matching backend yet (Phases 6-7 aren't built), so a
// created ride can't be polled for a real match. The UI still relies on the
// local WebSocket simulation layer (see websocket/client.ts) to drive the
// REQUESTED -> MATCHING -> ... state transitions and hand the request to the
// driver dashboard — that part is a deliberate stand-in for Dispatch Service,
// not dummy data, and is broadcast below using the ride's real id/fare/rider
// identity. What's real: the ride is actually created in Rider Service and
// published as a Kafka ride.requested event, using the caller's authenticated
// identity, not a fabricated one.
export async function createRide(req: CreateRideRequest): Promise<Ride> {
  const distanceKm = calculateDistanceKm(req.pickup, req.destination);
  const durationMins = Math.round(distanceKm * 2.5);

  const baseMeta = VEHICLE_METADATA[req.vehicleType] ?? VEHICLE_METADATA.ECONOMY;
  const calculatedFare = Math.round(baseMeta.fare + distanceKm * 15);

  const backendRes = await apiFetch<BackendCreateRideResponse>('/rides', {
    method: 'POST',
    body: JSON.stringify({
      riderId: req.riderId,
      pickup: { lat: req.pickup.latitude, lng: req.pickup.longitude },
      destination: { lat: req.destination.latitude, lng: req.destination.longitude },
    }),
  });

  const ride: Ride = {
    id: backendRes.rideId,
    riderId: req.riderId,
    riderName: req.riderName,
    riderPhone: req.riderPhone,
    vehicleType: req.vehicleType,
    pickup: req.pickup,
    destination: req.destination,
    fare: calculatedFare,
    status: 'REQUESTED',
    distanceKm,
    durationMins,
    etaMinutes: req.etaMinutes,
    paymentMethod: req.paymentMethod,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  wsClient.send('ride.status.changed', { rideId: ride.id, status: 'REQUESTED', ride });
  wsClient.send('driver.request.received', {
    rideId: ride.id,
    riderId: ride.riderId,
    riderPhone: ride.riderPhone,
    pickup: ride.pickup,
    destination: ride.destination,
    fare: ride.fare,
    distanceKm: ride.distanceKm,
    vehicleType: ride.vehicleType,
    expiresInSeconds: 15,
    riderName: ride.riderName,
  });

  return ride;
}

export async function cancelRide(rideId: string): Promise<void> {
  await apiFetch(`/rides/${rideId}/cancel`, { method: 'POST' });
  wsClient.send('ride.status.changed', { rideId, status: 'CANCELLED' });
}
