import { create } from 'zustand';
import { LocationPoint, VehicleType } from '../types';
import { NearbyVehicleEstimate } from '../api/rides';

export type ActiveTab = 'ride' | 'drive' | 'reserve' | 'rentals' | 'eats';

interface BookingState {
  activeTab: ActiveTab;
  pickup: LocationPoint | null;
  destination: LocationPoint | null;
  selectedVehicle: VehicleType;
  scheduleTime: string | null;
  paymentMethod: 'CASH' | 'MOCK_PAYMENT';
  // The real nearby driver/vehicle RideOptionsList fetched for this pickup —
  // shared here so createRide can use its real ETA without re-fetching.
  nearbyVehicle: NearbyVehicleEstimate | null;

  setActiveTab: (tab: ActiveTab) => void;
  setPickup: (loc: LocationPoint | null) => void;
  setDestination: (loc: LocationPoint | null) => void;
  setSelectedVehicle: (vehicle: VehicleType) => void;
  setPaymentMethod: (method: 'CASH' | 'MOCK_PAYMENT') => void;
  setScheduleTime: (time: string | null) => void;
  setNearbyVehicle: (estimate: NearbyVehicleEstimate | null) => void;
  swapPickupDestination: () => void;
  reset: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  activeTab: 'ride',
  // No hardcoded city default — LocationSearchInputs seeds this on mount
  // from the browser's real geolocation, falling back to a real online
  // driver's location if geolocation isn't available/permitted.
  pickup: null,
  destination: null,
  selectedVehicle: 'ECONOMY',
  scheduleTime: null,
  paymentMethod: 'MOCK_PAYMENT',
  nearbyVehicle: null,

  setActiveTab: (activeTab) => set({ activeTab }),
  setPickup: (pickup) => set({ pickup }),
  setDestination: (destination) => set({ destination }),
  setSelectedVehicle: (selectedVehicle) => set({ selectedVehicle }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setScheduleTime: (scheduleTime) => set({ scheduleTime }),
  setNearbyVehicle: (nearbyVehicle) => set({ nearbyVehicle }),

  swapPickupDestination: () =>
    set((state) => ({
      pickup: state.destination,
      destination: state.pickup,
    })),

  reset: () =>
    set({
      pickup: null,
      destination: null,
      selectedVehicle: 'ECONOMY',
      scheduleTime: null,
      nearbyVehicle: null,
    }),
}));
