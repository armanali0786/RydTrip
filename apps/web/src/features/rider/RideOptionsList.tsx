import React, { useEffect, useState } from 'react';
import { findNearbyVehicle, calculateDistanceKm } from '../../api/rides';
import { useBookingStore } from '../../stores/useBookingStore';
import { Users, Clock, ShieldCheck, CreditCard, ArrowRight, Loader2, CarFront } from 'lucide-react';

interface RideOptionsListProps {
  onConfirmRide: () => void;
  isSubmitting?: boolean;
}

export const RideOptionsList: React.FC<RideOptionsListProps> = ({
  onConfirmRide,
  isSubmitting = false,
}) => {
  const {
    pickup,
    destination,
    setSelectedVehicle,
    paymentMethod,
    setPaymentMethod,
    nearbyVehicle,
    setNearbyVehicle,
  } = useBookingStore();

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const distanceKm = pickup && destination ? calculateDistanceKm(pickup, destination) : 4.2;

  // Real nearby-driver lookup, re-run whenever the pickup point changes (a
  // new search or a geolocation update should re-check who's actually near
  // the new pickup, not keep showing a stale estimate).
  useEffect(() => {
    if (!pickup) return;
    let cancelled = false;

    setIsLoading(true);
    setLoadError(null);
    findNearbyVehicle(pickup)
      .then((estimate) => {
        if (cancelled) return;
        setNearbyVehicle(estimate);
        if (estimate) {
          setSelectedVehicle(estimate.option.type);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not check for nearby drivers right now');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup?.latitude, pickup?.longitude]);

  const calculatedFare = nearbyVehicle ? Math.round(nearbyVehicle.option.fare + distanceKm * 15) : null;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl p-6 shadow-card border border-[#0e0f0c]">
      <h2 className="font-display text-2xl font-black text-[#0e0f0c] mb-1">Choose your ride</h2>
      <p className="text-xs font-semibold text-[#454745] mb-4">
        Available vehicles near your pickup location
      </p>

      {/* Vehicle Option — the one real nearest driver, not a static list */}
      <div className="space-y-3">
        {isLoading && (
          <div className="flex items-center gap-2 p-4 text-sm font-semibold text-[#454745]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Finding drivers near you…
          </div>
        )}

        {!isLoading && loadError && (
          <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-body-sm text-red-700 border border-red-100">
            {loadError}
          </div>
        )}

        {!isLoading && !loadError && !nearbyVehicle && (
          <div className="rounded-lg bg-[#e8ebe6] px-3.5 py-3 text-sm font-semibold text-[#454745]">
            No drivers online near this pickup point right now. Try again shortly.
          </div>
        )}

        {!isLoading && nearbyVehicle && calculatedFare !== null && (
          <div className="w-full flex items-center justify-between p-4 rounded-xl border border-[#0e0f0c] bg-[#e2f6d5] shadow-sm ring-2 ring-[#9fe870]">
            <div className="flex items-center gap-4">
              <img
                src={nearbyVehicle.option.image}
                alt={nearbyVehicle.option.name}
                className="h-12 w-16 object-cover rounded-lg shadow-sm border border-[#0e0f0c]/10"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-base font-extrabold text-[#0e0f0c]">
                    {nearbyVehicle.option.name}
                  </span>
                  <span className="flex items-center text-xs font-bold text-[#0e0f0c] bg-[#e8ebe6] px-2.5 py-0.5 rounded-full">
                    <Users className="h-3 w-3 mr-1 text-[#454745]" />
                    {nearbyVehicle.option.capacity}
                  </span>
                </div>
                <div className="text-xs text-[#454745] flex items-center gap-1.5 mt-1 font-semibold">
                  <Clock className="h-3 w-3 text-[#054d28]" />
                  <span className="font-bold text-[#054d28]">~{nearbyVehicle.option.eta} min away</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <CarFront className="h-3 w-3" />
                    {nearbyVehicle.option.tagline}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="font-display text-xl font-black text-[#0e0f0c]">₹{calculatedFare}</div>
              <span className="text-[11px] font-black text-[#054d28] uppercase tracking-wider">Selected</span>
            </div>
          </div>
        )}
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
          disabled={isSubmitting || isLoading || !nearbyVehicle}
          className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-[#9fe870] hover:bg-[#cdffad] active:bg-[#c5edab] text-[#0e0f0c] font-black text-base shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-50"
        >
          <span>
            {isSubmitting
              ? 'Requesting Ride...'
              : nearbyVehicle
                ? `Confirm ${nearbyVehicle.option.type}`
                : 'No rides available'}
          </span>
          <ArrowRight className="h-5 w-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
