import { apiFetch } from './client';

// Backend: POST /drivers/:id/location { lat, lng } -> 202 (Location Service,
// see services/location-service/src/locations/locations.controller.ts).
// This is what actually puts a driver into the Redis GEO index that
// GET /drivers/nearby searches — going "online" in the UI alone never did.
export async function updateDriverLocation(driverId: string, lat: number, lng: number): Promise<void> {
  await apiFetch(`/drivers/${driverId}/location`, {
    method: 'POST',
    body: JSON.stringify({ lat, lng }),
  });
}

// Driver Service's real status enum (see driver-state-machine.ts) — distinct
// from the UI's OFFLINE/ONLINE/BUSY, and the source of truth this app was
// never actually writing to: toggling "online" in the UI used to only flip
// local state, leaving the DB row stuck on whatever it last was.
export type BackendDriverStatus = 'OFFLINE' | 'AVAILABLE' | 'RESERVED' | 'ON_TRIP' | 'SUSPENDED';

export interface BackendDriver {
  id: string;
  status: BackendDriverStatus;
}

export async function getDriver(driverId: string): Promise<BackendDriver> {
  return apiFetch<BackendDriver>(`/drivers/${driverId}`);
}

export interface DriverProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicleType: string;
  city: string;
  licenseNumber: string;
  vehicleRegistrationNumber: string;
  insurancePolicyNumber: string;
  permitNumber?: string;
  status: BackendDriverStatus;
  rating: number;
  createdAt: string;
}

// GET /drivers/:id — the driver's own full profile, used by ProfilePage.
// Distinct from getDriverContact's PII-limited shape, which is what a
// *different* person (the matched rider) is allowed to see.
export async function getDriverProfile(driverId: string): Promise<DriverProfile> {
  return apiFetch<DriverProfile>(`/drivers/${driverId}`);
}

export interface UpdateDriverProfileInput {
  name?: string;
  phone?: string;
  email?: string;
  city?: string;
}

export async function updateDriverProfile(driverId: string, input: UpdateDriverProfileInput): Promise<DriverProfile> {
  return apiFetch<DriverProfile>(`/drivers/${driverId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function updateDriverStatus(
  driverId: string,
  status: BackendDriverStatus
): Promise<BackendDriver> {
  return apiFetch<BackendDriver>(`/drivers/${driverId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export interface DriverContact {
  name: string;
  phone: string;
  vehicleType: string;
}

// GET /drivers/:id/contact — PII-limited (name + phone + vehicleType), the
// shape a rider matched to this driver's trip is allowed to see (see
// drivers.controller.ts). Powers the rider's DriverMatchedCard.
export async function getDriverContact(driverId: string): Promise<DriverContact> {
  return apiFetch<DriverContact>(`/drivers/${driverId}/contact`);
}
