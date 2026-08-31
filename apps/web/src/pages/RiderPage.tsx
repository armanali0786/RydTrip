import React, { useEffect, useState } from 'react';
import { Navbar } from '../components/ui/Navbar';
import { Footer } from '../components/ui/Footer';
import { RideMap } from '../components/map/RideMap';
import { RideOptionsList } from '../features/rider/RideOptionsList';
import {
  FindingDriverCard,
  DriverMatchedCard,
  TripInProgressCard,
  TripCompletedCard,
} from '../features/rider/RideStatusCards';
import { useBookingStore } from '../stores/useBookingStore';
import { useRideStore } from '../stores/useRideStore';
import { useAuthStore } from '../stores/useAuthStore';
import { createRide, cancelRide } from '../api/rides';
import { wsClient } from '../websocket/client';
import { Button } from '../components/ui/Button';
import { MapPin, Navigation, ArrowLeft } from 'lucide-react';
import { RequireAuth } from '../components/auth/RequireAuth';

const RiderPageContent: React.FC = () => {
  const { pickup, destination, selectedVehicle, paymentMethod } = useBookingStore();
  const { activeRide, driverLocation, setActiveRide, updateRideStatus, assignDriver, updateDriverLocation, cancelActiveRide, resetRide } =
    useRideStore();
  const { user } = useAuthStore();

  const [step, setStep] = useState<'SELECT_RIDE' | 'ACTIVE_RIDE'>('SELECT_RIDE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Subscribe to WebSocket events for real-time ride state transitions
  useEffect(() => {
    wsClient.connect();

    const unsubStatus = wsClient.subscribe('ride.status.changed', (evt) => {
      const { rideId, status } = evt.payload;
      if (activeRide && activeRide.id === rideId) {
        updateRideStatus(status);
      }
    });

    const unsubDriverAssigned = wsClient.subscribe('driver.assigned', (evt) => {
      const { driver } = evt.payload;
      assignDriver(driver);
    });

    const unsubDriverLoc = wsClient.subscribe('driver.location.updated', (evt) => {
      const { location } = evt.payload;
      updateDriverLocation(location);
    });

    return () => {
      unsubStatus();
      unsubDriverAssigned();
      unsubDriverLoc();
    };
  }, [activeRide, updateRideStatus, assignDriver, updateDriverLocation]);

  const handleRequestRide = async () => {
    if (!pickup || !destination || !user) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const newRide = await createRide({
        riderId: user.id,
        riderName: user.name,
        riderPhone: user.phone,
        pickup,
        destination,
        vehicleType: selectedVehicle,
        paymentMethod,
      });

      setActiveRide(newRide);
      setStep('ACTIVE_RIDE');
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to request a ride');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (activeRide) {
      await cancelRide(activeRide.id);
      cancelActiveRide();
    }
    setStep('SELECT_RIDE');
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-text">
      <Navbar />

      <main className="flex-1 relative flex flex-col lg:flex-row h-[calc(100vh-68px)]">
        {/* Left Side Floating Panel */}
        <div className="w-full lg:w-[460px] shrink-0 p-4 lg:p-6 overflow-y-auto z-10 bg-canvas lg:shadow-card flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-display text-display-md text-ink">Rider Web</span>
                {user && <div className="text-caption text-body">{user.name} • {user.phone}</div>}
              </div>
              {step === 'ACTIVE_RIDE' && (
                <button
                  onClick={() => setStep('SELECT_RIDE')}
                  className="flex items-center gap-1 text-body-sm font-semibold text-body hover:text-ink"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to choices
                </button>
              )}
            </div>

            {/* Pickup / Dropoff Summary Box */}
            <div className="rounded-xl bg-canvas-soft p-4 space-y-2 text-body-sm">
              <div className="flex items-center gap-3">
                <span className="text-primary font-bold">📍</span>
                <span className="truncate font-medium text-ink">
                  {pickup?.address || 'Hitec City, Hyderabad'}
                </span>
              </div>
              <div className="border-t border-canvas-softer pt-2 flex items-center gap-3">
                <span className="text-primary font-bold">🏁</span>
                <span className="truncate font-medium text-ink">
                  {destination?.address || 'Secunderabad Railway Station, Hyderabad'}
                </span>
              </div>
            </div>

            {/* Step 1: Ride Options Selection */}
            {step === 'SELECT_RIDE' && (
              <>
                {submitError && (
                  <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-body-sm text-red-700 border border-red-100">
                    {submitError}
                  </div>
                )}
                <RideOptionsList
                  onConfirmRide={handleRequestRide}
                  isSubmitting={isSubmitting}
                />
              </>
            )}

            {/* Step 2: Active Ride States */}
            {step === 'ACTIVE_RIDE' && activeRide && (
              <>
                {(activeRide.status === 'REQUESTED' || activeRide.status === 'MATCHING') && (
                  <FindingDriverCard onCancel={handleCancel} />
                )}

                {(activeRide.status === 'MATCHED' ||
                  activeRide.status === 'DRIVER_ARRIVING' ||
                  activeRide.status === 'DRIVER_ARRIVED') && (
                  <DriverMatchedCard onCancel={handleCancel} />
                )}

                {activeRide.status === 'IN_PROGRESS' && <TripInProgressCard />}

                {activeRide.status === 'COMPLETED' && (
                  <TripCompletedCard
                    onNewRide={() => {
                      resetRide();
                      setStep('SELECT_RIDE');
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Side Full Map */}
        <div className="flex-1 h-full min-h-[400px]">
          <RideMap
            pickup={pickup}
            destination={destination}
            driverLocation={driverLocation}
            height="100%"
          />
        </div>
      </main>
    </div>
  );
};

export const RiderPage: React.FC = () => (
  <RequireAuth role="RIDER">
    <RiderPageContent />
  </RequireAuth>
);
