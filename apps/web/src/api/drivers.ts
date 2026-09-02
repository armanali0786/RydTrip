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
