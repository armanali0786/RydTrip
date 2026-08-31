import React, { useEffect, useState } from 'react';
import { MapPin, Navigation, Clock, ShieldCheck, DollarSign } from 'lucide-react';
import { useDriverStore } from '../../stores/useDriverStore';
import { Button } from '../../components/ui/Button';

export const RideRequestModal: React.FC = () => {
  const { incomingRequest, acceptRideRequest, rejectRideRequest } = useDriverStore();
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    if (!incomingRequest) {
      setTimeLeft(15);
      return;
    }

    setTimeLeft(15);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          rejectRideRequest(); // Expired
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [incomingRequest, rejectRideRequest]);

  if (!incomingRequest) return null;

  const progressPercent = (timeLeft / 15) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-[460px] rounded-xl bg-canvas p-6 shadow-card border border-canvas-soft space-y-5">
        {/* Countdown Bar */}
        <div>
          <div className="flex items-center justify-between text-body-sm font-bold text-ink mb-2">
            <span className="flex items-center gap-1.5 text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
              New Ride Request
            </span>
            <span>{timeLeft}s remaining</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-canvas-soft">
            <div
              className="h-full bg-primary transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Fare & Vehicle Highlight */}
        <div className="flex items-center justify-between rounded-xl bg-canvas-soft p-4">
          <div>
            <div className="text-caption text-mute uppercase font-semibold">Vehicle & Passenger</div>
            <div className="font-display text-body-lg font-bold text-ink">
              {incomingRequest.vehicleType} • {incomingRequest.riderName}
            </div>
            <div className="text-caption text-body">⭐ {incomingRequest.riderRating} Rider rating</div>
          </div>

          <div className="text-right">
            <div className="text-caption text-mute uppercase font-semibold">Estimated Fare</div>
            <div className="font-display text-display-md font-bold text-ink">₹{incomingRequest.fare}</div>
          </div>
        </div>

        {/* Route Info */}
        <div className="space-y-3 text-body-sm">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="text-caption text-mute font-semibold uppercase">Pickup ({incomingRequest.distanceKm} km away)</div>
              <div className="font-medium text-ink">{incomingRequest.pickup.address}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Navigation className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-caption text-mute font-semibold uppercase">Destination</div>
              <div className="font-medium text-ink">{incomingRequest.destination.address}</div>
            </div>
          </div>
        </div>

        {/* Accept / Reject Action Pills */}
        <div className="flex items-center gap-3 pt-2">
          <Button variant="subtle" size="lg" className="flex-1" onClick={rejectRideRequest}>
            Decline
          </Button>
          <Button variant="primary" size="lg" className="flex-1" onClick={acceptRideRequest}>
            Accept Ride (₹{incomingRequest.fare})
          </Button>
        </div>
      </div>
    </div>
  );
};
