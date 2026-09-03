import React, { useEffect } from 'react';
import { Navbar } from '../components/ui/Navbar';
import { RideMap } from '../components/map/RideMap';
import { useDriverStore } from '../stores/useDriverStore';
import { useAuthStore } from '../stores/useAuthStore';
import { DriverTripCard } from '../features/driver/DriverTripCard';
import { Button } from '../components/ui/Button';
import { ShieldCheck, Navigation, DollarSign, Award, RefreshCw } from 'lucide-react';
import { RequireAuth } from '../components/auth/RequireAuth';
import { wsClient } from '../websocket/client';

// How often the dashboard polls for a Dispatch Service assignment — there's
// no real-time push transport yet, so this is how a driver actually learns
// they've been assigned a ride (see pollActiveTrip's own note on why).
const ACTIVE_TRIP_POLL_MS = 4000;

const DriverPageContent: React.FC = () => {
  const { user } = useAuthStore();
  const {
    status,
    toggleOnline,
    currentLocation,
    setCurrentLocation,
    activeTrip,
    todaysTripsCount,
    todaysEarnings,
    syncStatusFromBackend,
    pollActiveTrip,
  } = useDriverStore();

  // Drives the navbar's connection badge (Live Dispatch / Local Demo Mode) —
  // unrelated to driver online/offline status, but still needs calling or
  // the badge is stuck showing "Offline" regardless of the real driver state.
  useEffect(() => {
    wsClient.connect();
  }, []);

  // Pull the real DB status on load instead of trusting the local default —
  // toggleOnline() only ever wrote local state before, so the UI could show
  // ONLINE while the driver row was still OFFLINE.
  useEffect(() => {
    if (user?.id) {
      syncStatusFromBackend(user.id);
    }
  }, [user?.id, syncStatusFromBackend]);

  // Poll for a real Dispatch Service assignment the whole time the
  // dashboard is open — not gated on `status` so a driver who's already
  // RESERVED/ON_TRIP (e.g. after a refresh) still discovers/reconciles
  // their in-progress trip.
  useEffect(() => {
    if (!user?.id) return;
    const driverId = user.id;
    pollActiveTrip(driverId);
    const interval = setInterval(() => pollActiveTrip(driverId), ACTIVE_TRIP_POLL_MS);
    return () => clearInterval(interval);
  }, [user?.id, pollActiveTrip]);

  // Real device GPS drives the driver's position when available and permitted;
  // otherwise falls back to a simulated jitter walk (most desktop dev setups).
  // Either way, setCurrentLocation is what pings Location Service, and a
  // heartbeat re-sends the last known fix well inside its 30s TTL — watchPosition
  // alone won't refire if the device simply isn't moving.
  useEffect(() => {
    if (status !== 'ONLINE' && !activeTrip) return;

    let watchId: number | null = null;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;

    const jitterTick = () => {
      const loc = useDriverStore.getState().currentLocation;
      setCurrentLocation({
        ...loc,
        latitude: loc.latitude + (Math.random() - 0.5) * 0.001,
        longitude: loc.longitude + (Math.random() - 0.5) * 0.001,
      });
    };

    const startFallback = () => {
      if (fallbackInterval) return;
      fallbackInterval = setInterval(jitterTick, 4000);
    };

    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setCurrentLocation({
            ...useDriverStore.getState().currentLocation,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        startFallback,
        { enableHighAccuracy: true, maximumAge: 15000 }
      );
    } else {
      startFallback();
    }

    // Register immediately on go-online instead of waiting for the first tick.
    setCurrentLocation(useDriverStore.getState().currentLocation);
    const heartbeat = setInterval(() => {
      setCurrentLocation(useDriverStore.getState().currentLocation);
    }, 15000);

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (fallbackInterval) clearInterval(fallbackInterval);
      clearInterval(heartbeat);
    };
  }, [status, activeTrip, setCurrentLocation]);

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-text">
      <Navbar />

      <main className="flex-1 relative flex flex-col lg:flex-row h-[calc(100vh-68px)]">
        {/* Left Control Panel */}
        <div className="w-full lg:w-[460px] shrink-0 p-4 lg:p-6 overflow-y-auto z-10 bg-canvas lg:shadow-card flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            {/* Header + Online / Offline Toggle */}
            <div className="flex items-center justify-between border-b border-canvas-soft pb-4">
              <div>
                <span className="font-display text-display-md text-ink">Driver Dashboard</span>
                <div className="text-caption text-body">
                  {user?.name}
                  {user?.vehicleType && <> • {user.vehicleType}</>}
                </div>
                <div className="text-caption text-mute">{user?.phone}</div>
              </div>

              <button
                onClick={toggleOnline}
                className={`flex items-center gap-2 rounded-pill px-4 py-2 font-bold text-body-sm transition-all ${
                  status === 'ONLINE'
                    ? 'bg-emerald-500 text-on-dark shadow-sm'
                    : status === 'BUSY'
                    ? 'bg-amber-500 text-on-dark'
                    : 'bg-canvas-soft text-body hover:bg-surface-pressed'
                }`}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-canvas animate-pulse"></span>
                <span>{status === 'ONLINE' ? 'ONLINE' : status === 'BUSY' ? 'ON TRIP' : 'OFFLINE'}</span>
              </button>
            </div>

            {/* Daily Stats Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-canvas-soft p-4 border border-canvas-softer">
                <div className="text-caption text-mute font-semibold uppercase">Today's Earnings</div>
                <div className="font-display text-display-md font-bold text-ink">₹{todaysEarnings}</div>
              </div>

              <div className="rounded-xl bg-canvas-soft p-4 border border-canvas-softer">
                <div className="text-caption text-mute font-semibold uppercase">Trips Completed</div>
                <div className="font-display text-display-md font-bold text-ink">{todaysTripsCount}</div>
              </div>
            </div>

            {/* Active Trip Execution Card */}
            {activeTrip ? (
              <DriverTripCard />
            ) : (
              <div className="rounded-xl bg-canvas-soft p-6 text-center space-y-3 border border-canvas-softer">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-canvas text-primary shadow-sm font-bold text-xl">
                  🚗
                </div>
                <h3 className="font-display text-body-lg text-ink font-bold">
                  {status === 'ONLINE' ? 'Looking for ride requests...' : 'You are offline'}
                </h3>
                <p className="text-body-sm text-body">
                  {status === 'ONLINE'
                    ? 'Stay online to receive ride dispatch requests nearby'
                    : 'Tap the status button above to go online and start earning'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Map View */}
        <div className="flex-1 min-h-[400px]">
          <RideMap
            driverLocation={currentLocation}
            pickup={activeTrip?.pickup}
            destination={activeTrip?.destination}
            height="100%"
          />
        </div>
      </main>
    </div>
  );
};

export const DriverPage: React.FC = () => (
  <RequireAuth role="DRIVER">
    <DriverPageContent />
  </RequireAuth>
);
