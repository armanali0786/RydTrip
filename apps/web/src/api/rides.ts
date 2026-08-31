import { LocationPoint, Ride, RideStatus, VehicleOption, VehicleType } from '../types';
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

export async function createRide(req: CreateRideRequest): Promise<Ride> {
  const distanceKm = calculateDistanceKm(req.pickup, req.destination);
  const durationMins = Math.round(distanceKm * 2.5);

  const baseOption = VEHICLE_OPTIONS.find((v) => v.type === req.vehicleType) || VEHICLE_OPTIONS[0];
  const calculatedFare = Math.round(baseOption.fare + distanceKm * 15);

  const rideId = `ride_${Date.now().toString(36)}`;
  const newRide: Ride = {
    id: rideId,
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

  try {
    const res = await apiFetch<Ride>('/rides', {
      method: 'POST',
      body: JSON.stringify(newRide),
    });
    return res;
  } catch (e) {
    // Local state fallback & broadcast to drivers
    wsClient.send('ride.status.changed', {
      rideId: newRide.id,
      status: 'REQUESTED',
      ride: newRide,
    });

    wsClient.send('driver.request.received', {
      rideId: newRide.id,
      pickup: newRide.pickup,
      destination: newRide.destination,
      fare: newRide.fare,
      distanceKm: newRide.distanceKm,
      vehicleType: newRide.vehicleType,
      expiresInSeconds: 15,
      riderName: newRide.riderName,
      riderRating: 4.9,
    });

    return newRide;
  }
}

export async function cancelRide(rideId: string): Promise<void> {
  try {
    await apiFetch(`/rides/${rideId}/cancel`, { method: 'POST' });
  } catch (e) {
    // broadcast event locally
  }
  wsClient.send('ride.status.changed', {
    rideId,
    status: 'CANCELLED',
  });
}
