import React, { useEffect, useState } from 'react';
import { Navbar } from '../components/ui/Navbar';
import { RideMap } from '../components/map/RideMap';
import { RideOptionsList } from '../features/rider/RideOptionsList';
import { LocationSearchInputs } from '../components/booking/LocationSearchInputs';
import {
  FindingDriverCard,
  DriverMatchedCard,
  TripInProgressCard,
  TripCompletedCard,
} from '../features/rider/RideStatusCards';
import { useBookingStore } from '../stores/useBookingStore';
import { useRideStore } from '../stores/useRideStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useToastStore } from '../stores/useToastStore';
import { createRide, cancelRide } from '../api/rides';
import { getTrip } from '../api/trips';
import { getDriverContact } from '../api/drivers';
import { wsClient } from '../websocket/client';
import { ArrowLeft, X } from 'lucide-react';
import { LoginPage } from './LoginPage';
import { RideStatus } from '../types';

// How often the rider's screen polls for the real backend ride state —
// there's no real-time push transport yet (dispatch-service, and the
// driver's own arrive/start/complete actions, all happen against the real
// backend independently of this tab), so this is how a rider actually
// learns their ride was matched/arrived/started/completed. The
// ride.status.changed WS events above still fire too (same-browser demo),
// this just makes it work across separate rider/driver sessions for real.
const RIDE_POLL_MS = 4000;
const TERMINAL_STATUSES: RideStatus[] = ['COMPLETED', 'CANCELLED'];

/**
 * Browsing (locations, map, price comparison) needs no login — only actually
 * requesting a ride does. So this page is never wrapped in RequireAuth; an
 * unauthenticated rider sees the full booking UI and only hits a login
 * prompt on "Confirm", surfaced as an overlay (not a redirect) so their
 * pickup/dropoff/vehicle choice — already in useBookingStore, untouched by
 * navigation — carries straight through once they've logged in.
 */
export const RiderPage: React.FC = () => {
  const { pickup, destination, selectedVehicle, paymentMethod, nearbyVehicle } = useBookingStore();
  const { activeRide, driverLocation, setActiveRide, updateRideStatus, assignDriver, updateDriverLocation, cancelActiveRide, resetRide } =
    useRideStore();
  const { user, isAuthenticated } = useAuthStore();
  const { showToast } = useToastStore();

  const [step, setStep] = useState<'SELECT_RIDE' | 'ACTIVE_RIDE'>('SELECT_RIDE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showLoginGate, setShowLoginGate] = useState(false);

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

  // Poll the real backend for this ride's true state — the actual fix for
  // "the rider's screen never advances past Finding your driver" when the
  // driver is a different browser/session (see RIDE_POLL_MS's own note).
  useEffect(() => {
    if (!activeRide || TERMINAL_STATUSES.includes(activeRide.status)) return;

    const rideId = activeRide.id;
    let stopped = false;

    const poll = async () => {
      let trip;
      try {
        trip = await getTrip(rideId);
      } catch {
        return; // Best-effort — try again next tick.
      }
      if (stopped) return;

      const current = useRideStore.getState().activeRide;
      if (!current || current.id !== rideId) return;

      // Backend's ride status values are a strict subset of the frontend's
      // RideStatus union (it never returns 'IDLE') — safe to pass through.
      const status = trip.status as RideStatus;

      // MATCHED means Dispatch found a driver but they haven't tapped
      // Accept yet (see trip-service's ride-state-machine.ts) — the rider
      // stays on "Finding your driver..." and only learns who it is once
      // the driver actually accepts, same as the FindingDriverCard/
      // DriverMatchedCard split below.
      if (trip.driverId && status !== 'MATCHED' && (!current.driver || current.driver.id !== trip.driverId)) {
        const contact = await getDriverContact(trip.driverId).catch(() => null);
        assignDriver({
          id: trip.driverId,
          name: contact?.name ?? 'Driver',
          phone: contact?.phone ?? '',
          vehicleModel: 'Vehicle details not yet tracked',
          currentLocation: current.pickup,
        });
      }

      if (status !== useRideStore.getState().activeRide?.status) {
        updateRideStatus(status);
      }
    };

    poll();
    const interval = setInterval(poll, RIDE_POLL_MS);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [activeRide?.id, activeRide?.status, assignDriver, updateRideStatus]);

  const handleRequestRide = async () => {
    if (!isAuthenticated || !user) {
      setShowLoginGate(true);
      return;
    }
    if (!pickup || !destination) return;

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
        etaMinutes: nearbyVehicle?.option.eta ?? 5,
      });

      setActiveRide(newRide);
      setStep('ACTIVE_RIDE');
      showToast('Ride requested! Finding your driver…', 'success');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to request a ride';
      setSubmitError(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Once a login/register triggered from the gate succeeds, isAuthenticated
  // flips true and this fires the ride request the user originally asked
  // for — pickup/destination/vehicle were never lost, they live in
  // useBookingStore, untouched by the login overlay.
  useEffect(() => {
    if (isAuthenticated && showLoginGate) {
      setShowLoginGate(false);
      void handleRequestRide();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleCancel = async () => {
    if (activeRide) {
      try {
        await cancelRide(activeRide.id);
        cancelActiveRide();
        showToast('Ride cancelled', 'info');
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Failed to cancel the ride', 'error');
        return;
      }
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

            {/* Step 1: editable pickup/dropoff search — open to everyone, no login needed */}
            {step === 'SELECT_RIDE' ? (
              <LocationSearchInputs />
            ) : (
              <div className="rounded-xl bg-canvas-soft p-4 space-y-2 text-body-sm">
                <div className="flex items-center gap-3">
                  <span className="text-primary font-bold">📍</span>
                  <span className="truncate font-medium text-ink">{pickup?.address}</span>
                </div>
                <div className="border-t border-canvas-softer pt-2 flex items-center gap-3">
                  <span className="text-primary font-bold">🏁</span>
                  <span className="truncate font-medium text-ink">{destination?.address}</span>
                </div>
              </div>
            )}

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
                {/* MATCHED = Dispatch found a driver but they haven't tapped
                    Accept yet (see the polling effect above) — still "finding". */}
                {(activeRide.status === 'REQUESTED' ||
                  activeRide.status === 'MATCHING' ||
                  activeRide.status === 'MATCHED') && <FindingDriverCard onCancel={handleCancel} />}

                {(activeRide.status === 'DRIVER_ARRIVING' || activeRide.status === 'DRIVER_ARRIVED') && (
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
        <div className="flex-1 min-h-[400px]">
          <RideMap
            pickup={pickup}
            destination={destination}
            driverLocation={driverLocation}
            height="100%"
          />
        </div>
      </main>

      {/* Login gate — only shown when an unauthenticated rider tries to
          confirm a ride. Browsing above needs none of this. LoginPage owns
          the full viewport by design (same as every other RequireAuth
          site), so this overlays it full-screen rather than as a card. */}
      {showLoginGate && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            onClick={() => setShowLoginGate(false)}
            className="absolute right-4 top-4 z-10 rounded-full bg-white p-2 text-ink hover:bg-canvas-soft shadow-card border border-ink/10"
            aria-label="Keep browsing without logging in"
          >
            <X className="h-5 w-5" />
          </button>
          <LoginPage requiredRole="RIDER" />
        </div>
      )}
    </div>
  );
};
