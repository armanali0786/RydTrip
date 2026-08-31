import React from 'react';
import { VEHICLE_OPTIONS, calculateDistanceKm } from '../../api/rides';
import { useBookingStore } from '../../stores/useBookingStore';
import { VehicleType } from '../../types';
import { Button } from '../../components/ui/Button';
import { Users, Clock, ShieldCheck, CreditCard } from 'lucide-react';

interface RideOptionsListProps {
  onConfirmRide: () => void;
  isSubmitting?: boolean;
}

export const RideOptionsList: React.FC<RideOptionsListProps> = ({
  onConfirmRide,
  isSubmitting = false,
}) => {
  const { pickup, destination, selectedVehicle, setSelectedVehicle, paymentMethod, setPaymentMethod } =
    useBookingStore();

  const distanceKm = pickup && destination ? calculateDistanceKm(pickup, destination) : 4.2;

  return (
    <div className="flex flex-col h-full bg-canvas rounded-xl p-5 shadow-card border border-canvas-soft">
      <h2 className="font-display text-display-md text-ink mb-2">Choose a ride</h2>
      <p className="text-body-sm text-body mb-4">
        Recommended options based on your location and group size
      </p>

      {/* Vehicle Options List */}
      <div className="space-y-3 overflow-y-auto max-h-[380px] pr-1">
        {VEHICLE_OPTIONS.map((option) => {
          const calculatedFare = Math.round(option.fare + distanceKm * 15);
          const isSelected = selectedVehicle === option.type;

          return (
            <button
              key={option.type}
              type="button"
              onClick={() => setSelectedVehicle(option.type)}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                isSelected
                  ? 'border-primary bg-canvas-soft/70 shadow-sm ring-1 ring-primary'
                  : 'border-canvas-soft bg-canvas hover:bg-canvas-softer'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <img
                  src={option.image}
                  alt={option.name}
                  className="h-12 w-16 object-cover rounded-md"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-body-md-strong text-ink">{option.name}</span>
                    <span className="flex items-center text-caption text-body bg-canvas-soft px-2 py-0.5 rounded-pill">
                      <Users className="h-3 w-3 mr-1" />
                      {option.capacity}
                    </span>
                  </div>
                  <div className="text-caption text-body flex items-center gap-1.5 mt-0.5">
                    <Clock className="h-3 w-3 text-mute" />
                    <span>~{option.eta} min away</span>
                    <span>•</span>
                    <span>{option.tagline}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-display text-body-lg text-ink font-bold">₹{calculatedFare}</div>
                {isSelected && (
                  <span className="text-[11px] font-semibold text-emerald-600">Selected</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Payment Method Selector */}
      <div className="mt-4 pt-4 border-t border-canvas-soft flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setPaymentMethod(paymentMethod === 'MOCK_PAYMENT' ? 'CASH' : 'MOCK_PAYMENT')
          }
          className="flex items-center gap-2 text-body-sm font-medium text-ink bg-canvas-soft px-3.5 py-2 rounded-pill hover:bg-surface-pressed transition-colors"
        >
          <CreditCard className="h-4 w-4 text-ink" />
          <span>{paymentMethod === 'MOCK_PAYMENT' ? '💳 Mock Payment Card' : '💵 Cash'}</span>
        </button>

        <span className="text-caption text-mute flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          RydTrip Safety Included
        </span>
      </div>

      {/* Confirm Ride Black Conversion Pill */}
      <div className="mt-5 pt-2">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onConfirmRide}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Requesting Ride...' : `Confirm ${selectedVehicle}`}
        </Button>
      </div>
    </div>
  );
};
