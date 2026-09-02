import React, { useEffect } from 'react';
import { Navbar } from '../components/ui/Navbar';
import { RideMap } from '../components/map/RideMap';
import { useDriverStore } from '../stores/useDriverStore';
import { useAuthStore } from '../stores/useAuthStore';
import { DriverTripCard } from '../features/driver/DriverTripCard';
import { RideRequestModal } from '../features/driver/RideRequestModal';
import { Button } from '../components/ui/Button';
import { wsClient } from '../websocket/client';
import { ShieldCheck, Navigation, DollarSign, Award, RefreshCw } from 'lucide-react';
import { RequireAuth } from '../components/auth/RequireAuth';

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
    setIncomingRequest,
  } = useDriverStore();

  // Listen to WebSocket driver events (e.g. driver request received)
  useEffect(() => {
    wsClient.connect();

    const unsubReq = wsClient.subscribe('driver.request.received', (evt) => {
      if (status === 'ONLINE' && !activeTrip) {
        setIncomingRequest(evt.payload);
      }
    });

    return () => {
      unsubReq();
    };
  }, [status, activeTrip, setIncomingRequest]);

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
        <div className="flex-1 h-full min-h-[400px]">
          <RideMap
            driverLocation={currentLocation}
            pickup={activeTrip?.pickup}
            destination={activeTrip?.destination}
            height="100%"
          />
        </div>

        {/* Incoming Ride Alert Modal with 15s Timer */}
        <RideRequestModal />
      </main>
    </div>
  );
};

export const DriverPage: React.FC = () => (
  <RequireAuth role="DRIVER">
    <DriverPageContent />
  </RequireAuth>
);
