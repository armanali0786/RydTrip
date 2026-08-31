import React from 'react';
import { VEHICLE_OPTIONS, calculateDistanceKm } from '../../api/rides';
import { useBookingStore } from '../../stores/useBookingStore';
import { Users, Clock, ShieldCheck, CreditCard, ArrowRight } from 'lucide-react';

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
    <div className="flex flex-col h-full bg-white rounded-xl p-6 shadow-card border border-[#0e0f0c]">
      <h2 className="font-display text-2xl font-black text-[#0e0f0c] mb-1">Choose your ride</h2>
      <p className="text-xs font-semibold text-[#454745] mb-4">
        Available vehicles near your pickup location
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
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left cursor-pointer ${
                isSelected
                  ? 'border-[#0e0f0c] bg-[#e2f6d5] shadow-sm ring-2 ring-[#9fe870]'
                  : 'border-[#0e0f0c]/10 bg-white hover:bg-[#e8ebe6]'
              }`}
            >
              <div className="flex items-center gap-4">
                <img
                  src={option.image}
                  alt={option.name}
                  className="h-12 w-16 object-cover rounded-lg shadow-sm border border-[#0e0f0c]/10"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-base font-extrabold text-[#0e0f0c]">{option.name}</span>
                    <span className="flex items-center text-xs font-bold text-[#0e0f0c] bg-[#e8ebe6] px-2.5 py-0.5 rounded-full">
                      <Users className="h-3 w-3 mr-1 text-[#454745]" />
                      {option.capacity}
                    </span>
                  </div>
                  <div className="text-xs text-[#454745] flex items-center gap-1.5 mt-1 font-semibold">
                    <Clock className="h-3 w-3 text-[#054d28]" />
                    <span className="font-bold text-[#054d28]">~{option.eta} min away</span>
                    <span>•</span>
                    <span>{option.tagline}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-display text-xl font-black text-[#0e0f0c]">₹{calculatedFare}</div>
                {isSelected && (
                  <span className="text-[11px] font-black text-[#054d28] uppercase tracking-wider">Selected</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Payment Method Selector */}
      <div className="mt-4 pt-4 border-t border-[#0e0f0c]/10 flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setPaymentMethod(paymentMethod === 'MOCK_PAYMENT' ? 'CASH' : 'MOCK_PAYMENT')
          }
          className="flex items-center gap-2 text-xs font-bold text-[#0e0f0c] bg-[#e8ebe6] px-4 py-2 rounded-full hover:bg-[#d8dcd5] transition-colors cursor-pointer"
        >
          <CreditCard className="h-4 w-4 text-[#0e0f0c]" />
          <span>{paymentMethod === 'MOCK_PAYMENT' ? '💳 RydTrip Pay' : '💵 Cash'}</span>
        </button>

        <span className="text-xs font-bold text-[#054d28] flex items-center gap-1 bg-[#e2f6d5] px-3 py-1 rounded-full">
          <ShieldCheck className="h-4 w-4 text-[#054d28]" />
          RydTrip Guarantee
        </span>
      </div>

      {/* Wise Signature Lime-Green #9fe870 Confirm Button */}
      <div className="mt-5 pt-1">
        <button
          type="button"
          onClick={onConfirmRide}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-[#9fe870] hover:bg-[#cdffad] active:bg-[#c5edab] text-[#0e0f0c] font-black text-base shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-50"
        >
          <span>{isSubmitting ? 'Requesting Ride...' : `Confirm ${selectedVehicle}`}</span>
          <ArrowRight className="h-5 w-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
