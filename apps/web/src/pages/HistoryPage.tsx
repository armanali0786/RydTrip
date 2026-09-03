import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '../components/ui/Navbar';
import { Footer } from '../components/ui/Footer';
import { RequireAuth } from '../components/auth/RequireAuth';
import { useAuthStore } from '../stores/useAuthStore';
import { getRideHistoryForRider, getRideHistoryForDriver, BackendTrip } from '../api/trips';
import { Calendar, MapPin, Navigation, CheckCircle2, XCircle, Clock, Route as RouteIcon } from 'lucide-react';

const TERMINAL_STATUSES = new Set(['COMPLETED', 'CANCELLED']);

function coord(point: { lat: number; lng: number }): string {
  return `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
}

function StatusBadge({ status }: { status: BackendTrip['status'] }) {
  if (status === 'COMPLETED') {
    return (
      <span className="flex items-center text-caption font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-pill">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
      </span>
    );
  }
  if (status === 'CANCELLED') {
    return (
      <span className="flex items-center text-caption font-semibold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-pill">
        <XCircle className="h-3 w-3 mr-1" /> Cancelled
      </span>
    );
  }
  return (
    <span className="flex items-center text-caption font-semibold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-pill">
      <Clock className="h-3 w-3 mr-1" /> In progress
    </span>
  );
}

const HistoryPageContent: React.FC = () => {
  const { user } = useAuthStore();

  const { data: rides, isLoading, isError } = useQuery({
    queryKey: ['ride-history', user?.role, user?.id],
    queryFn: () =>
      user?.role === 'DRIVER' ? getRideHistoryForDriver(user.id) : getRideHistoryForRider(user!.id),
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-text">
      <Navbar />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-[1000px] px-4 sm:px-6">
          <h1 className="font-display text-display-xl text-ink mb-2">Trip Activity</h1>
          <p className="text-body-md text-body mb-8">Your booking history — every ride you've requested or driven</p>

          {isLoading && (
            <div className="rounded-xl bg-canvas-soft p-10 text-center text-body-sm text-body border border-canvas-softer">
              Loading your trips…
            </div>
          )}

          {isError && (
            <div className="rounded-xl bg-red-50 p-10 text-center text-body-sm text-red-700 border border-red-100">
              Couldn't load your trip history. Try again shortly.
            </div>
          )}

          {!isLoading && !isError && (!rides || rides.length === 0) && (
            <div className="rounded-xl bg-canvas-soft p-10 text-center text-body-sm text-body border border-canvas-softer">
              No rides yet — completed rides will show up here.
            </div>
          )}

          {!isLoading && !isError && rides && rides.length > 0 && (
            <div className="space-y-4">
              {rides.map((ride) => (
                <div
                  key={ride.id}
                  className="rounded-xl bg-canvas p-6 shadow-subtle border border-canvas-soft flex flex-col md:flex-row justify-between gap-6 items-start md:items-center"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-caption text-mute flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(ride.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <StatusBadge status={ride.status} />
                      {ride.status === 'CANCELLED' && ride.cancellationReason && (
                        <span className="text-caption text-mute">({ride.cancellationReason.replace(/_/g, ' ').toLowerCase()})</span>
                      )}
                    </div>

                    <div className="space-y-1 text-body-sm">
                      <div className="flex items-center gap-2 font-medium text-ink">
                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                        <span>{coord(ride.pickup)}</span>
                      </div>
                      <div className="flex items-center gap-2 font-medium text-ink">
                        <Navigation className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>{coord(ride.destination)}</span>
                      </div>
                      {ride.distanceKm !== undefined && (
                        <div className="flex items-center gap-2 text-caption text-mute">
                          <RouteIcon className="h-3.5 w-3.5" />
                          <span>{ride.distanceKm.toFixed(1)} km</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-display text-display-md font-bold text-ink">
                      {ride.fare !== undefined ? `₹${ride.fare}` : '—'}
                    </div>
                    <div className="text-caption text-body">{ride.fare !== undefined ? 'Fare' : 'No charge'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export const HistoryPage: React.FC = () => (
  <RequireAuth>
    <HistoryPageContent />
  </RequireAuth>
);
