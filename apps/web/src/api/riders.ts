import { apiFetch } from './client';

export interface RiderContact {
  name: string;
  phone: string;
}

// GET /riders/:id/contact — PII-limited (name + phone only), the shape a
// driver assigned to this rider's trip is allowed to see (see
// riders.controller.ts). Powers the assigned-trip card's rider name/Call button.
export async function getRiderContact(riderId: string): Promise<RiderContact> {
  return apiFetch<RiderContact>(`/riders/${riderId}/contact`);
}

export interface RiderProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  rating: number;
  createdAt: string;
}

// GET /riders/:id — the rider's own full profile (name/phone/email/rating),
// used by ProfilePage. Distinct from getRiderContact's PII-limited shape,
// which is what a *different* person (the matched driver) is allowed to see.
export async function getRiderProfile(riderId: string): Promise<RiderProfile> {
  return apiFetch<RiderProfile>(`/riders/${riderId}`);
}

export interface UpdateRiderProfileInput {
  name?: string;
  phone?: string;
  email?: string;
}

export async function updateRiderProfile(riderId: string, input: UpdateRiderProfileInput): Promise<RiderProfile> {
  return apiFetch<RiderProfile>(`/riders/${riderId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
