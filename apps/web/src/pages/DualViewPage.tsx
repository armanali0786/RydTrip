import React, { useEffect } from 'react';
import { Navbar } from '../components/ui/Navbar';
import { RideMap } from '../components/map/RideMap';
import { RideOptionsList } from '../features/rider/RideOptionsList';
import { FindingDriverCard, DriverMatchedCard, TripInProgressCard, TripCompletedCard } from '../features/rider/RideStatusCards';
import { DriverTripCard } from '../features/driver/DriverTripCard';
import { RideRequestModal } from '../features/driver/RideRequestModal';
import { useBookingStore } from '../stores/useBookingStore';
import { useRideStore } from '../stores/useRideStore';
import { useDriverStore } from '../stores/useDriverStore';
import { createRide, cancelRide } from '../api/rides';
import { wsClient } from '../websocket/client';
import { Layers, ArrowRight, Zap, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const DualViewPage: React.FC = () => {
  const { pickup, destination, selectedVehicle, paymentMethod } = useBookingStore();
  const { activeRide, driverLocation, setActiveRide, updateRideStatus, assignDriver, updateDriverLocation, resetRide } =
    useRideStore();
  const {
    status: driverStatus,
    toggleOnline,
    currentLocation: driverCurrentLoc,
    setCurrentLocation: setDriverLoc,
    activeTrip,
    todaysEarnings,
    setIncomingRequest,
  } = useDriverStore();

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

    const unsubDriverReq = wsClient.subscribe('driver.request.received', (evt) => {
      if (driverStatus === 'ONLINE' && !activeTrip) {
        setIncomingRequest(evt.payload);
      }
    });

    return () => {
      unsubStatus();
      unsubAssigned();
      unsubDriverLoc();
      unsubDriverReq();
    };
  }, [activeRide, driverStatus, activeTrip, updateRideStatus, assignDriver, updateDriverLocation, setIncomingRequest]);

  const handleRiderSubmit = async () => {
    if (!pickup || !destination) return;
    const newRide = await createRide({
      riderId: 'rider_arman_01',
      riderName: 'Arman Ali',
      riderPhone: '+91 98765 43210',
      pickup,
      destination,
      vehicleType: selectedVehicle,
      paymentMethod,
    });
    setActiveRide(newRide);
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
          <Button variant="secondary" size="sm" onClick={() => { resetRide(); useDriverStore.getState().rejectRideRequest(); }}>
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
              onClick={toggleOnline}
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

      <RideRequestModal />
    </div>
  );
};
