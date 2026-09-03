export type RideStatus =
  | 'IDLE'
  | 'REQUESTED'
  | 'MATCHING'
  | 'MATCHED'
  | 'DRIVER_ARRIVING'
  | 'DRIVER_ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type DriverStatus = 'OFFLINE' | 'ONLINE' | 'BUSY';

export type VehicleType = 'ECONOMY' | 'PREMIUM' | 'AUTO' | 'MOTO' | 'XL';

export interface LocationPoint {
  latitude: number;
  longitude: number;
  address: string;
  name?: string;
}

export interface VehicleOption {
  type: VehicleType;
  name: string;
  capacity: number;
  eta: number; // in minutes
  fare: number; // in INR
  image: string;
  tagline: string;
}

export interface DriverInfo {
  id: string;
  name: string;
  // Not yet tracked by any backend service (no ratings/trip-count aggregation,
  // no vehicle color/plate on file) — omit rather than fabricate.
  rating?: number;
  totalTrips?: number;
  vehicleModel: string;
  vehicleColor?: string;
  licensePlate?: string;
  phone: string;
  currentLocation: LocationPoint;
}

export interface Ride {
  id: string;
  riderId: string;
  riderName: string;
  riderPhone: string;
  driver?: DriverInfo;
  vehicleType: VehicleType;
  pickup: LocationPoint;
  destination: LocationPoint;
  fare: number;
  status: RideStatus;
  distanceKm: number;
  durationMins: number;
  etaMinutes: number;
  paymentMethod: 'CASH' | 'MOCK_PAYMENT';
  createdAt: string;
  updatedAt: string;
  // Rider-only pickup verification code (see api/trips.ts's getTripOtp) —
  // never populated on the driver's side of this same client-only Ride type,
  // since the backend never sends it in response to a driver's own token.
  otp?: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'RIDER' | 'DRIVER';
  // Only present for DRIVER — the vehicle body type Driver Service has on file.
  vehicleType?: string;
  rating?: number;
  avatar?: string;
}

export type WebSocketEventType =
  | 'ride.status.changed'
  | 'driver.assigned'
  | 'driver.location.updated'
  | 'trip.started'
  | 'trip.completed'
  | 'ride.cancelled'
  | 'driver.request.received'
  | 'connection.state';

export interface WebSocketEvent<T = any> {
  eventType: WebSocketEventType;
  eventId: string;
  timestamp: string;
  correlationId?: string;
  payload: T;
}

export interface RideRequestPayload {
  rideId: string;
  riderId: string;
  riderPhone: string;
  pickup: LocationPoint;
  destination: LocationPoint;
  fare: number;
  distanceKm: number;
  vehicleType: VehicleType;
  expiresInSeconds: number;
  riderName: string;
}
