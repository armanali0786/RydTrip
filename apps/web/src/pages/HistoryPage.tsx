import React from 'react';
import { Navbar } from '../components/ui/Navbar';
import { Footer } from '../components/ui/Footer';
import { useRideStore } from '../stores/useRideStore';
import { Calendar, MapPin, Navigation, Clock, CheckCircle2 } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const { history } = useRideStore();

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-text">
      <Navbar />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-[1000px] px-4 sm:px-6">
          <h1 className="font-display text-display-xl text-ink mb-2">Trip Activity</h1>
          <p className="text-body-md text-body mb-8">View your completed rides and trip receipts</p>

          <div className="space-y-4">
            {history.map((ride) => (
              <div
                key={ride.id}
                className="rounded-xl bg-canvas p-6 shadow-subtle border border-canvas-soft flex flex-col md:flex-row justify-between gap-6 items-start md:items-center"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="rounded-pill bg-canvas-soft px-3 py-1 text-caption font-bold text-ink">
                      {ride.vehicleType}
                    </span>
                    <span className="text-caption text-mute">
                      {new Date(ride.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="flex items-center text-caption font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-pill">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
                    </span>
                  </div>

                  <div className="space-y-1 text-body-sm">
                    <div className="flex items-center gap-2 font-medium text-ink">
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <span>{ride.pickup.address}</span>
                    </div>
                    <div className="flex items-center gap-2 font-medium text-ink">
                      <Navigation className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{ride.destination.address}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-display text-display-md font-bold text-ink">₹{ride.fare}</div>
                  <div className="text-caption text-body">Paid via {ride.paymentMethod}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
