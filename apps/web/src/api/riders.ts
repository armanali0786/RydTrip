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
