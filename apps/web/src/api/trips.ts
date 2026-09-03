import { apiFetch } from './client';

export type BackendRideStatus =
  | 'REQUESTED'
  | 'MATCHING'
  | 'MATCHED'
  | 'DRIVER_ARRIVING'
  | 'DRIVER_ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface BackendTrip {
  id: string;
  riderId: string;
  driverId?: string;
  pickup: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  status: BackendRideStatus;
  cancellationReason?: string;
  // Set only once the trip reaches COMPLETED (see trips.service.ts's
  // complete()) — a deterministic distance-based estimate, not a real
  // charged amount (no payment processor exists). Absent otherwise.
  fare?: number;
  distanceKm?: number;
  createdAt: string;
  updatedAt: string;
}

// GET /trips/driver/:driverId/active -> the driver's currently assigned ride
// (anything Dispatch Service has matched, up to but not including
// COMPLETED/CANCELLED), or null. Polled from the driver dashboard — there's
// no real-time push transport yet (dispatch-service auto-accepts entirely
// server-side, see its own comments), so this poll is how a driver actually
// learns they've been assigned a ride at all.
export async function getActiveTripForDriver(driverId: string): Promise<BackendTrip | null> {
  const res = await apiFetch<{ ride: BackendTrip | null }>(`/trips/driver/${driverId}/active`);
  return res.ride;
}

// GET /trips/:id — the rider's side of the same polling story as
// getActiveTripForDriver: no real-time push transport exists, so this is how
// a rider's own screen learns the ride has been matched, arrived, started,
// or completed (see RiderPage's polling effect).
export async function getTrip(tripId: string): Promise<BackendTrip> {
  return apiFetch<BackendTrip>(`/trips/${tripId}`);
}

export async function acceptTrip(tripId: string): Promise<BackendTrip> {
  return apiFetch<BackendTrip>(`/trips/${tripId}/accept`, { method: 'POST' });
}

export async function declineTrip(tripId: string): Promise<BackendTrip> {
  return apiFetch<BackendTrip>(`/trips/${tripId}/decline`, { method: 'POST' });
}

export async function markDriverArrived(tripId: string): Promise<BackendTrip> {
  return apiFetch<BackendTrip>(`/trips/${tripId}/driver-arrived`, { method: 'POST' });
}

export async function startTrip(tripId: string, otp: string): Promise<BackendTrip> {
  return apiFetch<BackendTrip>(`/trips/${tripId}/start`, {
    method: 'POST',
    body: JSON.stringify({ otp }),
  });
}

// GET /trips/:id/otp — the rider's own pickup code, read out to the driver
// in person and entered into startTrip() above. Rider-only at the gateway
// (see jwt-auth.guard.ts's ROLE_POLICIES); a driver's token gets a 403, and
// this is why the code never rides along on the shared getTrip() response
// both roles poll. `null` while the driver hasn't accepted yet.
export async function getTripOtp(tripId: string): Promise<string | null> {
  const res = await apiFetch<{ otp: string | null }>(`/trips/${tripId}/otp`);
  return res.otp;
}

export async function completeTrip(tripId: string): Promise<BackendTrip> {
  return apiFetch<BackendTrip>(`/trips/${tripId}/complete`, { method: 'POST' });
}

// GET /trips/rider/:riderId/history — real, persisted booking history for
// the rider's Activity page (replacing the old client-only fake history).
export async function getRideHistoryForRider(riderId: string, limit = 20): Promise<BackendTrip[]> {
  const res = await apiFetch<{ rides: BackendTrip[] }>(`/trips/rider/${riderId}/history?limit=${limit}`);
  return res.rides;
}

// Same as above, driver's side.
export async function getRideHistoryForDriver(driverId: string, limit = 20): Promise<BackendTrip[]> {
  const res = await apiFetch<{ rides: BackendTrip[] }>(`/trips/driver/${driverId}/history?limit=${limit}`);
  return res.rides;
}
