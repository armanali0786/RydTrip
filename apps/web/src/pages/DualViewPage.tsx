import React, { useEffect } from 'react';
import { Navbar } from '../components/ui/Navbar';
import { RideMap } from '../components/map/RideMap';
import { RideOptionsList } from '../features/rider/RideOptionsList';
import { FindingDriverCard, DriverMatchedCard, TripInProgressCard, TripCompletedCard } from '../features/rider/RideStatusCards';
import { DriverTripCard } from '../features/driver/DriverTripCard';
import { useBookingStore } from '../stores/useBookingStore';
import { useRideStore } from '../stores/useRideStore';
import { useDriverStore } from '../stores/useDriverStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useToastStore } from '../stores/useToastStore';
import { createRide, cancelRide } from '../api/rides';
import { wsClient } from '../websocket/client';
import { Layers, ArrowRight, Zap, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { RequireAuth } from '../components/auth/RequireAuth';
import { Ride } from '../types';

const DualViewPageContent: React.FC = () => {
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const { pickup, destination, selectedVehicle, paymentMethod, nearbyVehicle } = useBookingStore();
  const { activeRide, driverLocation, setActiveRide, updateRideStatus, assignDriver, updateDriverLocation, resetRide } =
    useRideStore();
  const {
    status: driverStatus,
    currentLocation: driverCurrentLoc,
    setCurrentLocation: setDriverLoc,
    activeTrip,
    todaysEarnings,
  } = useDriverStore();

  // Local-only toggle for this sandbox's driver panel — useDriverStore's own
  // toggleOnline() now PATCHes the real driver-service record for the
  // logged-in account's id, which this page's "driver" isn't (see the
  // component doc comment: only the rider side is a real backend identity
  // here). Flipping local state directly keeps the demo panel working
  // without a real driver account behind it.
  const toggleDriverStatusLocal = () =>
    useDriverStore.setState((s) => ({ status: s.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE' }));

  useEffect(() => {
    wsClient.connect();

    const unsubStatus = wsClient.subscribe('ride.status.changed', (evt) => {
      const { rideId, status } = evt.payload;
      if (activeRide && activeRide.id === rideId) {
        updateRideStatus(status);
      }
    });

    const unsubAssigned = wsClient.subscribe('driver.assigned', (evt) => {
      assignDriver(evt.payload.driver);
    });

    const unsubDriverLoc = wsClient.subscribe('driver.location.updated', (evt) => {
      updateDriverLocation(evt.payload.location);
    });

    // This sandbox plays both rider and driver from a single logged-in
    // account, so it can't go through the real per-driver Dispatch Service
    // poll or the real accept/decline step (see DriverPage/DriverTripCard) —
    // there's no second, real driver record behind this "driver" identity to
    // poll for or accept anything on. Auto-accepting the local request the
    // instant it arrives is a client-side-only stand-in for that step.
    const unsubDriverReq = wsClient.subscribe('driver.request.received', (evt) => {
      if (driverStatus !== 'ONLINE' || activeTrip) return;
      const req = evt.payload;
      const driverUser = useAuthStore.getState().user;
      if (!driverUser) return;

      const newTrip: Ride = {
        id: req.rideId,
        riderId: req.riderId,
        riderName: req.riderName,
        riderPhone: req.riderPhone,
        vehicleType: req.vehicleType,
        pickup: req.pickup,
        destination: req.destination,
        fare: req.fare,
        status: 'DRIVER_ARRIVING',
        distanceKm: req.distanceKm,
        durationMins: Math.round(req.distanceKm * 2.5),
        etaMinutes: 4,
        paymentMethod: 'MOCK_PAYMENT',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        driver: {
          id: driverUser.id,
          name: driverUser.name,
          phone: driverUser.phone,
          vehicleModel: 'Vehicle details not yet tracked',
          currentLocation: useDriverStore.getState().currentLocation,
        },
      };

      useDriverStore.setState({ activeTrip: newTrip, status: 'BUSY' });
      wsClient.send('driver.assigned', { rideId: req.rideId, driver: newTrip.driver });
      wsClient.send('ride.status.changed', { rideId: req.rideId, status: 'MATCHED', ride: newTrip });
    });

    return () => {
      unsubStatus();
      unsubAssigned();
      unsubDriverLoc();
      unsubDriverReq();
    };
  }, [activeRide, driverStatus, activeTrip, updateRideStatus, assignDriver, updateDriverLocation]);

  const handleRiderSubmit = async () => {
    if (!pickup || !destination || !user) return;
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
      showToast('Ride requested! Finding your driver…', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to request a ride', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-text">
      <Navbar />

      {/* Dual Banner Header */}
      <div className="bg-primary text-on-dark px-6 py-3 flex items-center justify-between border-b border-black-elevated">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-emerald-400" />
          <span className="font-display text-body-md-strong">Interactive Dual Dispatch Mode</span>
          <span className="text-caption text-canvas-soft/70">
            — Test the end-to-end Rider & Driver WebSocket dispatch loop in real time
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              resetRide();
              useDriverStore.setState({ activeTrip: null, status: 'OFFLINE' });
            }}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Reset Test Flow
          </Button>
        </div>
      </div>

      {/* Main Split-Screen Container */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 bg-canvas-soft">
        {/* LEFT PANEL: RIDER WEB */}
        <div className="flex flex-col bg-canvas rounded-xl shadow-card overflow-hidden border border-canvas-soft">
          <div className="bg-canvas border-b border-canvas-soft px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-primary"></span>
              <span className="font-display text-body-lg font-bold text-ink">1. Rider Web App</span>
            </div>
            <span className="text-caption font-semibold text-body">
              Status: {activeRide ? activeRide.status : 'IDLE'}
            </span>
          </div>

          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {!activeRide && (
              <RideOptionsList onConfirmRide={handleRiderSubmit} />
            )}

            {activeRide && (
              <>
                {(activeRide.status === 'REQUESTED' || activeRide.status === 'MATCHING') && (
                  <FindingDriverCard onCancel={() => resetRide()} />
                )}

                {(activeRide.status === 'MATCHED' ||
                  activeRide.status === 'DRIVER_ARRIVING' ||
                  activeRide.status === 'DRIVER_ARRIVED') && (
                  <DriverMatchedCard onCancel={() => resetRide()} />
                )}

                {activeRide.status === 'IN_PROGRESS' && <TripInProgressCard />}

                {activeRide.status === 'COMPLETED' && (
                  <TripCompletedCard onNewRide={() => resetRide()} />
                )}
              </>
            )}

            <div className="h-[280px] w-full rounded-xl overflow-hidden">
              <RideMap
                pickup={pickup}
                destination={destination}
                driverLocation={driverLocation}
                height="100%"
              />
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: DRIVER WEB */}
        <div className="flex flex-col bg-canvas rounded-xl shadow-card overflow-hidden border border-canvas-soft">
          <div className="bg-primary text-on-dark px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-400"></span>
              <span className="font-display text-body-lg font-bold">2. Driver Web App</span>
            </div>

            <button
              onClick={toggleDriverStatusLocal}
              className="rounded-pill bg-canvas text-primary px-3 py-1 text-caption font-bold"
            >
              {driverStatus === 'ONLINE' ? '🟢 ONLINE' : '🔴 OFFLINE'}
            </button>
          </div>

          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {activeTrip ? (
              <DriverTripCard />
            ) : (
              <div className="rounded-xl bg-canvas-soft p-6 text-center space-y-2 border border-canvas-softer">
                <div className="font-display text-body-lg font-bold text-ink">
                  {driverStatus === 'ONLINE' ? '🟢 Ready & Waiting for Requests' : '🔴 Driver is Offline'}
                </div>
                <p className="text-body-sm text-body">
                  Click "Confirm Ride" on the left panel to trigger a live dispatch request here.
                </p>
              </div>
            )}

            <div className="h-[280px] w-full rounded-xl overflow-hidden">
              <RideMap
                driverLocation={driverCurrentLoc}
                pickup={activeTrip?.pickup}
                destination={activeTrip?.destination}
                height="100%"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Any authenticated account can open this sandbox, but the rider panel's
// "Confirm Ride" only succeeds against the real backend when logged in as a
// rider — Rider Service validates the id against its own riders table
// (ADR-004: no cross-service foreign keys), and a driver id doesn't live there.
export const DualViewPage: React.FC = () => (
  <RequireAuth>
    <DualViewPageContent />
  </RequireAuth>
);
