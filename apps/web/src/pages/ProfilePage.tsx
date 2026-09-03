import React, { useState } from 'react';
import { Navbar } from '../components/ui/Navbar';
import { Footer } from '../components/ui/Footer';
import { Button } from '../components/ui/Button';
import { RequireAuth } from '../components/auth/RequireAuth';
import { useAuthStore } from '../stores/useAuthStore';
import { useToastStore } from '../stores/useToastStore';
import { updateRiderProfile } from '../api/riders';
import { updateDriverProfile, getDriverProfile, DriverProfile } from '../api/drivers';
import { Star, Phone, Mail, Calendar, Car, MapPin, ShieldCheck } from 'lucide-react';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

const ProfilePageContent: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const { showToast } = useToastStore();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Driver-only KYC fields (license/registration/insurance/city/vehicleType)
  // aren't carried on the shared `User` type — the login response only ever
  // included what the navbar/dashboards needed. Fetched once here instead of
  // widening User for a single-page concern.
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [driverLoaded, setDriverLoaded] = useState(false);

  React.useEffect(() => {
    if (user?.role !== 'DRIVER') return;
    getDriverProfile(user.id)
      .then(setDriverProfile)
      .finally(() => setDriverLoaded(true));
  }, [user?.id, user?.role]);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (user.role === 'RIDER') {
        const updated = await updateRiderProfile(user.id, { name, phone, email });
        updateUser({ name: updated.name, phone: updated.phone, email: updated.email, rating: updated.rating });
      } else {
        const updated = await updateDriverProfile(user.id, { name, phone, email });
        updateUser({ name: updated.name, phone: updated.phone, email: updated.email, rating: updated.rating });
        setDriverProfile(updated);
      }
      showToast('Profile updated', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update profile', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const memberSince = driverProfile?.createdAt
    ? new Date(driverProfile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-text">
      <Navbar />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-[900px] px-4 sm:px-6 space-y-6">
          <div>
            <h1 className="font-display text-display-xl text-ink mb-2">Profile</h1>
            <p className="text-body-md text-body">Manage your account details</p>
          </div>

          {/* Identity card */}
          <div className="rounded-xl bg-canvas p-6 shadow-subtle border border-canvas-soft flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-20 w-20 rounded-full object-cover border border-canvas-soft shrink-0" />
            ) : (
              <div className="h-20 w-20 rounded-full bg-canvas-soft flex items-center justify-center text-display-md font-black text-ink shrink-0">
                {initials(user.name)}
              </div>
            )}

            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-display text-display-md font-bold text-ink">{user.name}</span>
                <span className="rounded-pill bg-canvas-soft px-2.5 py-0.5 text-caption font-bold uppercase tracking-wider text-body">
                  {user.role}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-body-sm font-semibold text-ink">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span>{(user.rating ?? 5).toFixed(1)}</span>
                <span className="text-mute font-normal">rating</span>
              </div>

              {user.role === 'DRIVER' && driverProfile && (
                <div className="flex items-center gap-1.5 text-caption text-mute">
                  <Car className="h-3.5 w-3.5" />
                  <span>{driverProfile.vehicleType}</span>
                  {driverProfile.city && (
                    <>
                      <span>•</span>
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{driverProfile.city}</span>
                    </>
                  )}
                </div>
              )}

              {memberSince && (
                <div className="flex items-center gap-1.5 text-caption text-mute">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Member since {memberSince}</span>
                </div>
              )}
            </div>
          </div>

          {/* Edit contact details */}
          <form onSubmit={handleSave} className="rounded-xl bg-canvas p-6 shadow-subtle border border-canvas-soft space-y-4">
            <h2 className="font-display text-body-lg font-bold text-ink">Contact details</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="text-caption font-semibold text-body uppercase tracking-wide">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-canvas-softer bg-canvas px-3.5 py-2.5 text-body-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-caption font-semibold text-body uppercase tracking-wide flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Phone
                </span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full rounded-lg border border-canvas-softer bg-canvas px-3.5 py-2.5 text-body-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>

              <label className="block space-y-1.5 sm:col-span-2">
                <span className="text-caption font-semibold text-body uppercase tracking-wide flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-canvas-softer bg-canvas px-3.5 py-2.5 text-body-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
          </form>

          {/* Vehicle / KYC — driver only, read-only (verified at registration) */}
          {user.role === 'DRIVER' && driverLoaded && driverProfile && (
            <div className="rounded-xl bg-canvas p-6 shadow-subtle border border-canvas-soft space-y-4">
              <h2 className="font-display text-body-lg font-bold text-ink flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Vehicle &amp; documents
              </h2>
              <p className="text-caption text-mute -mt-2">Verified at registration — contact support to change these.</p>

              <div className="grid sm:grid-cols-2 gap-4 text-body-sm">
                <div>
                  <div className="text-caption text-mute uppercase tracking-wide">Vehicle type</div>
                  <div className="font-semibold text-ink">{driverProfile.vehicleType}</div>
                </div>
                <div>
                  <div className="text-caption text-mute uppercase tracking-wide">License number</div>
                  <div className="font-semibold text-ink">{driverProfile.licenseNumber || '—'}</div>
                </div>
                <div>
                  <div className="text-caption text-mute uppercase tracking-wide">Vehicle registration</div>
                  <div className="font-semibold text-ink">{driverProfile.vehicleRegistrationNumber || '—'}</div>
                </div>
                <div>
                  <div className="text-caption text-mute uppercase tracking-wide">Insurance policy</div>
                  <div className="font-semibold text-ink">{driverProfile.insurancePolicyNumber || '—'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export const ProfilePage: React.FC = () => (
  <RequireAuth>
    <ProfilePageContent />
  </RequireAuth>
);
