import React, { useState } from 'react';
import { Phone, Navigation, MapPin, CheckCircle, ShieldCheck } from 'lucide-react';
import { useDriverStore } from '../../stores/useDriverStore';
import { Button } from '../../components/ui/Button';

export const DriverTripCard: React.FC = () => {
  const { activeTrip, acceptTrip, declineTrip, arriveAtPickup, startTrip, completeTrip } = useDriverStore();
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  if (!activeTrip) return null;

  const isPendingAccept = activeTrip.status === 'MATCHED';

  const handleStartTrip = async () => {
    setOtpError(null);
    setIsStarting(true);
    try {
      await startTrip(otpInput);
    } catch (e) {
      setOtpError(e instanceof Error ? e.message : 'Could not verify OTP');
      return;
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="rounded-xl bg-canvas p-6 shadow-card border border-canvas-soft space-y-5">
      {/* Header status */}
      <div className="flex items-center justify-between border-b border-canvas-soft pb-4">
        <div>
          <span className="text-caption font-semibold uppercase tracking-wider text-emerald-600">
            {isPendingAccept && 'New Ride Request'}
            {activeTrip.status === 'DRIVER_ARRIVING' && 'En Route to Pickup'}
            {activeTrip.status === 'DRIVER_ARRIVED' && 'Arrived at Pickup Location'}
            {activeTrip.status === 'IN_PROGRESS' && 'Trip in Progress'}
          </span>
          <h2 className="font-display text-display-md text-ink">
            {isPendingAccept && 'Accept this ride?'}
            {activeTrip.status === 'DRIVER_ARRIVING' && 'Navigating to Rider'}
            {activeTrip.status === 'DRIVER_ARRIVED' && 'Waiting for Rider'}
            {activeTrip.status === 'IN_PROGRESS' && 'Driving to Destination'}
          </h2>
        </div>
        <div className="rounded-full bg-primary text-on-dark px-3 py-1 text-body-sm font-bold">
          ₹{activeTrip.fare}
        </div>
      </div>

      {/* Rider details */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-canvas-soft flex items-center justify-center font-bold text-ink">
            👤
          </div>
          <div>
            <div className="font-display text-body-lg text-ink font-bold">{activeTrip.riderName}</div>
            <div className="text-caption text-body">Payment: {activeTrip.paymentMethod}</div>
          </div>
        </div>

        <Button variant="subtle" size="sm" onClick={() => alert(`Calling rider ${activeTrip.riderPhone}...`)}>
          <Phone className="h-4 w-4 mr-1.5" />
          Call
        </Button>
      </div>

      {/* Pickup / Destination Addresses */}
      <div className="rounded-xl bg-canvas-soft p-4 space-y-3 text-body-sm">
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <div className="text-caption text-mute font-semibold uppercase">Pickup</div>
            <div className="font-medium text-ink">{activeTrip.pickup.address}</div>
          </div>
        </div>

        <div className="border-t border-canvas-softer pt-2 flex items-start gap-3">
          <Navigation className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-caption text-mute font-semibold uppercase">Destination</div>
            <div className="font-medium text-ink">{activeTrip.destination.address}</div>
          </div>
        </div>
      </div>

      {/* Workflow Action Buttons */}
      <div className="pt-2">
        {isPendingAccept && (
          <div className="flex items-center gap-3">
            <Button variant="subtle" size="lg" className="flex-1" onClick={declineTrip}>
              Decline
            </Button>
            <Button variant="primary" size="lg" className="flex-1" onClick={acceptTrip}>
              Accept Ride
            </Button>
          </div>
        )}

        {activeTrip.status === 'DRIVER_ARRIVING' && (
          <Button variant="primary" size="lg" fullWidth onClick={arriveAtPickup}>
            I've Arrived at Pickup
          </Button>
        )}

        {activeTrip.status === 'DRIVER_ARRIVED' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider text-mute">
                <ShieldCheck className="h-4 w-4" />
                Enter the rider's 4-digit OTP to start
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                autoComplete="one-time-code"
                value={otpInput}
                onChange={(e) => {
                  setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                  setOtpError(null);
                }}
                placeholder="0000"
                className="w-full rounded-xl border border-canvas-softer bg-canvas-soft px-4 py-3 text-center font-display text-display-md tracking-[0.4em] text-ink focus:border-primary focus:outline-none"
              />
              {otpError && <p className="mt-1.5 text-body-sm font-medium text-red-600">{otpError}</p>}
            </div>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={otpInput.length !== 4 || isStarting}
              onClick={handleStartTrip}
            >
              {isStarting ? 'Verifying…' : 'Start Trip'}
            </Button>
          </div>
        )}

        {activeTrip.status === 'IN_PROGRESS' && (
          <Button variant="primary" size="lg" fullWidth onClick={completeTrip}>
            Complete Trip
          </Button>
        )}
      </div>
    </div>
  );
};
