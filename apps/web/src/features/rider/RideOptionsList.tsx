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
    <div className="flex flex-col h-full bg-white rounded-2xl p-5 shadow-card border border-slate-100">
      <h2 className="font-display text-2xl font-black text-slate-900 mb-1">Choose your ride</h2>
      <p className="text-xs font-medium text-slate-500 mb-4">
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
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left cursor-pointer ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20'
                  : 'border-slate-200/80 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <img
                  src={option.image}
                  alt={option.name}
                  className="h-12 w-16 object-cover rounded-lg shadow-sm"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-base font-bold text-slate-900">{option.name}</span>
                    <span className="flex items-center text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                      <Users className="h-3 w-3 mr-1 text-slate-500" />
                      {option.capacity}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Clock className="h-3 w-3 text-emerald-600" />
                    <span className="font-semibold text-emerald-600">~{option.eta} min away</span>
                    <span>•</span>
                    <span>{option.tagline}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-display text-lg font-black text-slate-900">₹{calculatedFare}</div>
                {isSelected && (
                  <span className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider">Selected</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Payment Method Selector */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setPaymentMethod(paymentMethod === 'MOCK_PAYMENT' ? 'CASH' : 'MOCK_PAYMENT')
          }
          className="flex items-center gap-2 text-xs font-bold text-slate-800 bg-slate-100 px-3.5 py-2 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
        >
          <CreditCard className="h-4 w-4 text-slate-700" />
          <span>{paymentMethod === 'MOCK_PAYMENT' ? '💳 RydTrip Card' : '💵 Cash'}</span>
        </button>

        <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          RydTrip Safety Included
        </span>
      </div>

      {/* Confirm Ride Electric Emerald Button */}
      <div className="mt-5 pt-1">
        <button
          type="button"
          onClick={onConfirmRide}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold text-base shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-50"
        >
          <span>{isSubmitting ? 'Requesting Ride...' : `Confirm ${selectedVehicle}`}</span>
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
