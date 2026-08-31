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
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicleType: string;
  status: DriverStatus;
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
  createdAt: string;
  updatedAt: string;
}
