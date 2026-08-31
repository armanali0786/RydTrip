import { LocationPoint } from '../types';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
}

/**
 * Free OpenStreetMap Nominatim geocoding — no API key, no billing, matching
 * this project's ₹0 cost philosophy and the same OSM-based tile provider
 * RideMap already uses. Client-side, single-user lookups at this app's
 * scale are within Nominatim's usage policy; this is not a bulk/production
 * integration (that would need a paid provider or a self-hosted instance).
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<LocationPoint[]> {
  if (query.trim().length < 3) return [];

  const params = new URLSearchParams({
    format: 'jsonv2',
    q: query,
    limit: '5',
    countrycodes: 'in',
  });

  const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, { signal });
  if (!res.ok) throw new Error('Location search failed');
  const results = (await res.json()) as NominatimResult[];

  return results.map((r) => ({
    latitude: parseFloat(r.lat),
    longitude: parseFloat(r.lon),
    address: r.display_name,
    name: r.name || r.display_name.split(',')[0],
  }));
}

/** Best-effort — returns null (not a thrown error) on any failure, so a failed lookup never blocks using the coordinates themselves. */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(latitude),
    lon: String(longitude),
  });

  try {
    const res = await fetch(`${NOMINATIM_BASE}/reverse?${params}`);
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResult;
    return data.display_name ?? null;
  } catch {
    return null;
  }
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10_000,
      maximumAge: 60_000,
    });
  });
}
