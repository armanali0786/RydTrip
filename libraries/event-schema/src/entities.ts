import { CancellationReason, DriverStatus, RideStatus } from './enums';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Rider {
  id: string;
  name: string;
  phone: string;
  email: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
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
  status: DriverStatus;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface Ride {
  id: string;
  riderId: string;
  driverId?: string;
  pickup: GeoPoint;
  destination: GeoPoint;
  status: RideStatus;
  cancellationReason?: CancellationReason;
  fare?: number;
  distanceKm?: number;
  createdAt: string;
  updatedAt: string;
}
