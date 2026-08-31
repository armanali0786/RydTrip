import React from 'react';
import { Loader2, Phone, ShieldAlert, Star, CheckCircle2, Car, Navigation, AlertCircle } from 'lucide-react';
import { useRideStore } from '../../stores/useRideStore';
import { Button } from '../../components/ui/Button';

export const FindingDriverCard: React.FC<{ onCancel: () => void }> = ({ onCancel }) => {
  const { activeRide } = useRideStore();

  return (
    <div className="rounded-xl bg-canvas p-6 shadow-card border border-canvas-soft text-center space-y-4">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-canvas-soft">
        <Loader2 className="h-8 w-8 animate-spin text-ink" />
      </div>

      <div>
        <h2 className="font-display text-display-md text-ink">Finding your driver...</h2>
        <p className="text-body-sm text-body mt-1">
          Searching nearby drivers for {activeRide?.vehicleType || 'Economy'} ride
        </p>
      </div>

      <div className="rounded-md bg-canvas-soft p-3 text-left text-body-sm text-ink space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-caption text-mute uppercase">Pickup:</span>
          <span className="truncate font-medium">{activeRide?.pickup.address}</span>
        </div>
        <div className="flex items-center justify-between font-bold pt-1 border-t border-canvas-softer">
          <span>Estimated Fare:</span>
          <span>₹{activeRide?.fare}</span>
        </div>
      </div>

      <div className="pt-2">
        <Button variant="subtle" size="md" fullWidth onClick={onCancel}>
          Cancel Ride
        </Button>
      </div>
    </div>
  );
};

export const DriverMatchedCard: React.FC<{ onCancel: () => void }> = ({ onCancel }) => {
  const { activeRide } = useRideStore();
  const driver = activeRide?.driver;

  return (
    <div className="rounded-xl bg-canvas p-6 shadow-card border border-canvas-soft space-y-5">
      <div className="flex items-center justify-between border-b border-canvas-soft pb-4">
        <div>
          <span className="text-caption font-semibold uppercase tracking-wider text-emerald-600">
            Driver Assigned • Arriving
          </span>
          <h2 className="font-display text-display-md text-ink">ETA ~{activeRide?.etaMinutes || 4} min</h2>
        </div>
        <div className="rounded-full bg-emerald-50 px-3 py-1 text-caption font-bold text-emerald-700">
          En Route
        </div>
      </div>

      {/* Driver & Vehicle Details */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src={driver?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'}
            alt={driver?.name}
            className="h-14 w-14 rounded-full object-cover border-2 border-primary"
          />
          <div>
            <h3 className="font-display text-body-lg text-ink font-bold">{driver?.name || 'Rahul Sharma'}</h3>
            <div className="flex items-center gap-1.5 text-body-sm text-body">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold">{driver?.rating || 4.9}</span>
              <span>({driver?.totalTrips || 1240} trips)</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="font-display text-body-lg font-bold text-ink">{driver?.licensePlate || 'TS 07 EQ 9999'}</div>
          <div className="text-caption text-body">{driver?.vehicleModel || 'Toyota Camry'}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button variant="subtle" size="md" className="flex-1" onClick={() => alert(`Calling ${driver?.phone || 'driver'}...`)}>
          <Phone className="h-4 w-4 mr-2" />
          Call Driver
        </Button>
        <Button variant="subtle" size="md" className="flex-1" onClick={onCancel}>
          Cancel Ride
        </Button>
      </div>
    </div>
  );
};

export const TripInProgressCard: React.FC = () => {
  const { activeRide } = useRideStore();

  return (
    <div className="rounded-xl bg-canvas p-6 shadow-card border border-canvas-soft space-y-4">
      <div className="flex items-center justify-between border-b border-canvas-soft pb-3">
        <div>
          <span className="text-caption font-semibold uppercase tracking-wider text-emerald-600">
            Trip in Progress
          </span>
          <h2 className="font-display text-display-md text-ink">Heading to destination</h2>
        </div>
        <div className="animate-pulse rounded-full bg-emerald-500 h-3 w-3"></div>
      </div>

      <div className="rounded-md bg-canvas-soft p-3 text-body-sm space-y-1">
        <div className="text-caption text-mute font-semibold uppercase">Destination</div>
        <div className="font-medium text-ink flex items-center gap-2">
          <Navigation className="h-4 w-4 shrink-0 text-primary" />
          <span>{activeRide?.destination.address}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-body-sm">
        <span className="text-body">Trip Distance:</span>
        <span className="font-bold text-ink">{activeRide?.distanceKm || 4.2} km</span>
      </div>

      <div className="flex items-center justify-between text-body-sm border-t border-canvas-soft pt-2">
        <span className="text-body">Total Fare:</span>
        <span className="font-display text-body-lg font-bold text-ink">₹{activeRide?.fare}</span>
      </div>
    </div>
  );
};

export const TripCompletedCard: React.FC<{ onNewRide: () => void }> = ({ onNewRide }) => {
  const { activeRide } = useRideStore();

  return (
    <div className="rounded-xl bg-canvas p-6 shadow-card border border-canvas-soft text-center space-y-5">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 className="h-10 w-10" />
      </div>

      <div>
        <h2 className="font-display text-display-md text-ink">You have arrived!</h2>
        <p className="text-body-sm text-body mt-1">Thank you for riding with RydTrip</p>
      </div>

      <div className="rounded-xl bg-canvas-soft p-4 text-center space-y-1">
        <div className="text-caption text-mute uppercase font-semibold">Total Amount Charged</div>
        <div className="font-display text-display-xl font-bold text-ink">₹{activeRide?.fare || 240}</div>
        <div className="text-caption text-body">Paid via {activeRide?.paymentMethod || 'Mock Payment'}</div>
      </div>

      {/* Driver Rating Widget */}
      <div className="pt-2">
        <div className="text-body-sm font-semibold text-ink mb-2">Rate your driver ({activeRide?.driver?.name || 'Rahul'})</div>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button key={star} type="button" className="text-amber-400 hover:scale-110 transition-transform">
              <Star className="h-7 w-7 fill-amber-400" />
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2">
        <Button variant="primary" size="lg" fullWidth onClick={onNewRide}>
          Book Another Ride
        </Button>
      </div>
    </div>
  );
};
