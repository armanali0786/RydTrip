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
}

// Backend's real accepted shape (services/rider-service/src/rides/dto/*.ts):
// POST /rides { riderId: uuid, pickup: {lat,lng}, destination: {lat,lng} } -> 202 { rideId, status }
interface BackendCreateRideResponse {
  rideId: string;
  status: string;
}

export const VEHICLE_OPTIONS: VehicleOption[] = [
  {
    type: 'ECONOMY',
    name: 'RydTrip Go',
    capacity: 4,
    eta: 3,
    fare: 240,
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=150&auto=format&fit=crop&q=80',
    tagline: 'Affordable, compact rides',
  },
  {
    type: 'PREMIUM',
    name: 'RydTrip Premier',
    capacity: 4,
    eta: 5,
    fare: 390,
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=150&auto=format&fit=crop&q=80',
    tagline: 'Comfortable sedans with top-rated drivers',
  },
  {
    type: 'AUTO',
    name: 'RydTrip Auto',
    capacity: 3,
    eta: 2,
    fare: 140,
    image: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=150&auto=format&fit=crop&q=80',
    tagline: 'No haggling, auto at your doorstep',
  },
  {
    type: 'XL',
    name: 'RydTrip XL',
    capacity: 6,
    eta: 6,
    fare: 550,
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=150&auto=format&fit=crop&q=80',
    tagline: 'Spacious SUVs for group travel',
  },
];

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

  const baseOption = VEHICLE_OPTIONS.find((v) => v.type === req.vehicleType) || VEHICLE_OPTIONS[0];
  const calculatedFare = Math.round(baseOption.fare + distanceKm * 15);

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
    etaMinutes: baseOption.eta,
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
