// Cities offered in the driver onboarding city dropdown — a fixed list
// rather than free text, so getRequiredDocuments() below can match reliably
// without typo/casing drift (e.g. "Bangalore" vs "bengaluru").
export const SUPPORTED_CITIES = [
  'Hyderabad',
  'Bengaluru',
  'Mumbai',
  'Delhi',
  'Chennai',
  'Pune',
  'Kolkata',
  'Ahmedabad',
  'Jaipur',
  'Lucknow',
  'Chandigarh',
  'Kochi',
  'Coimbatore',
  'Nagpur',
  'Indore',
  'Surat',
];

// Commercial/taxi permits are a state RTO requirement that in practice only
// gets enforced in India's major metros — there's no backend rules engine for
// this, so it's a curated subset rather than a real per-city regulatory lookup.
const METRO_CITIES_REQUIRING_PERMIT = ['hyderabad', 'bengaluru', 'mumbai', 'delhi', 'chennai', 'pune', 'kolkata', 'ahmedabad'];

export interface DriverDocumentRequirement {
  key: 'licenseNumber' | 'vehicleRegistrationNumber' | 'insurancePolicyNumber' | 'permitNumber';
  label: string;
  required: boolean;
}

/** Suggests which documents to collect for a driver signing up in `city`. */
export function getRequiredDocuments(city: string): DriverDocumentRequirement[] {
  const needsPermit = METRO_CITIES_REQUIRING_PERMIT.includes(city.trim().toLowerCase());

  return [
    { key: 'licenseNumber', label: 'Valid Driving Licence (DL)', required: true },
    { key: 'vehicleRegistrationNumber', label: 'Vehicle Registration Certificate (RC)', required: true },
    { key: 'insurancePolicyNumber', label: 'Vehicle Insurance', required: true },
    { key: 'permitNumber', label: 'Commercial/Taxi Permit', required: needsPermit },
  ];
}
