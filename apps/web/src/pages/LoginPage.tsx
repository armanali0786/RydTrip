import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Loader2, ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { useToastStore } from '../stores/useToastStore';
import { getRequiredDocuments, SUPPORTED_CITIES } from '../utils/driverDocuments';

const DRIVER_VEHICLE_TYPES = ['SEDAN', 'SUV', 'HATCHBACK', 'AUTO', 'BIKE'] as const;

interface LoginPageProps {
  requiredRole?: 'RIDER' | 'DRIVER';
}

export const LoginPage: React.FC<LoginPageProps> = ({ requiredRole }) => {
  const { user, isAuthenticated, login, register, isLoading, error, clearError } = useAuthStore();
  const { showToast } = useToastStore();
  const navigate = useNavigate();

  // Only for the plain /login route (no requiredRole) — an already-logged-in
  // visitor lands on their own dashboard instead of the form again. Deliberately
  // NOT applied when requiredRole is set: that's RequireAuth's own fallback
  // (which already swaps to its real children the instant isAuthenticated
  // flips true, so this would never fire there anyway) and RiderPage's
  // mid-booking login overlay (`<LoginPage requiredRole="RIDER" />`), where a
  // redirect-to-dashboard here would yank the rider away from the ride they
  // were requesting instead of letting RiderPage's own effect close the
  // overlay and continue the booking in place.
  useEffect(() => {
    if (isAuthenticated && !requiredRole) {
      navigate(user?.role === 'DRIVER' ? '/driver' : '/rider', { replace: true });
    }
  }, [isAuthenticated, requiredRole, user, navigate]);

  const [role, setRole] = useState<'RIDER' | 'DRIVER'>(requiredRole ?? 'RIDER');
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleType, setVehicleType] = useState<string>(DRIVER_VEHICLE_TYPES[0]);
  const [city, setCity] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehicleRegistrationNumber, setVehicleRegistrationNumber] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [permitNumber, setPermitNumber] = useState('');

  const requiredDocuments = getRequiredDocuments(city);
  const permitRequired = requiredDocuments.find((d) => d.key === 'permitNumber')?.required ?? false;

  const resetForm = () => {
    setName('');
    setIdentifier('');
    setEmail('');
    setPhone('');
    setPassword('');
    setVehicleType(DRIVER_VEHICLE_TYPES[0]);
    setCity('');
    setLicenseNumber('');
    setVehicleRegistrationNumber('');
    setInsurancePolicyNumber('');
    setPermitNumber('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      if (mode === 'LOGIN') {
        await login(role, identifier, password);
        showToast(`Welcome back, ${useAuthStore.getState().user?.name ?? 'there'}!`, 'success');
        // No explicit navigate here — the isAuthenticated effect above is now
        // the single source of truth for "leave /login once signed in" (both
        // a fresh login and revisiting /login while already authenticated),
        // so it's the only thing deciding where an unrestricted /login visit
        // goes. Two redirects racing to different destinations (this used to
        // go to '/', the effect goes to /rider or /driver) was worse than one.
      } else {
        const registeredName = name;
        await register(role, {
          name,
          email,
          phone,
          password,
          ...(role === 'DRIVER'
            ? { vehicleType, city, licenseNumber, vehicleRegistrationNumber, insurancePolicyNumber, permitNumber: permitNumber || undefined }
            : {}),
        });
        showToast(`Account created — welcome, ${useAuthStore.getState().user?.name ?? registeredName}!`, 'success');
        resetForm();
      }
    } catch (err) {
      // Inline banner below still shows the store's `error` — the toast is
      // just the more visible, transient signal that something failed.
      showToast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#e8ebe6] text-[#0e0f0c] flex items-center justify-center font-text p-4">
      <div className="w-full max-w-[440px] space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="font-display text-4xl font-black text-[#0e0f0c] tracking-tight">RydTrip</span>
            <span className="rounded-full bg-[#e2f6d5] border border-[#c5edab] px-2.5 py-0.5 text-xs font-bold text-[#054d28]">Wise Spec</span>
          </div>
          <p className="text-sm font-semibold text-[#454745] text-center">
            {mode === 'LOGIN' ? 'Log in to continue your journey' : 'Create an account to get started'}
          </p>
        </div>

        {/* Role toggle segment control */}
        <div className="flex items-center rounded-xl bg-white p-1.5 border border-[#0e0f0c]/10">
          {(['RIDER', 'DRIVER'] as const).map((r) => (
            <button
              key={r}
              type="button"
              disabled={!!requiredRole}
              onClick={() => setRole(r)}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-extrabold transition-all cursor-pointer ${
                role === r
                  ? 'bg-[#0e0f0c] text-white shadow-sm'
                  : 'text-[#454745] hover:text-[#0e0f0c] hover:bg-[#e8ebe6]'
              }`}
            >
              {r === 'RIDER' ? 'Rider' : 'Driver'}
            </button>
          ))}
        </div>

        {/* Canonical Wise White Form Card (24px radius, 1px ink border) */}
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 md:p-8 shadow-card border border-[#0e0f0c]">
          {mode === 'REGISTER' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#454745] uppercase tracking-wider">Full name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[#0e0f0c]/10 bg-[#e8ebe6] px-4 py-3.5 text-sm font-semibold text-[#0e0f0c] outline-none focus:border-[#0e0f0c] focus:bg-white transition-all"
                placeholder="Priya Sharma"
              />
            </div>
          )}

          {mode === 'LOGIN' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#454745] uppercase tracking-wider">Email or phone</label>
              <input
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full rounded-lg border border-[#0e0f0c]/10 bg-[#e8ebe6] px-4 py-3.5 text-sm font-semibold text-[#0e0f0c] outline-none focus:border-[#0e0f0c] focus:bg-white transition-all"
                placeholder="priya@example.com or +919876543210"
              />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#454745] uppercase tracking-wider">Email</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-[#0e0f0c]/10 bg-[#e8ebe6] px-4 py-3.5 text-sm font-semibold text-[#0e0f0c] outline-none focus:border-[#0e0f0c] focus:bg-white transition-all"
                  placeholder="priya@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#454745] uppercase tracking-wider">Phone</label>
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-[#0e0f0c]/10 bg-[#e8ebe6] px-4 py-3.5 text-sm font-semibold text-[#0e0f0c] outline-none focus:border-[#0e0f0c] focus:bg-white transition-all"
                  placeholder="+919876543210"
                />
              </div>
              {role === 'DRIVER' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#454745] uppercase tracking-wider">Vehicle type</label>
                    <select
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="w-full rounded-lg border border-[#0e0f0c]/10 bg-[#e8ebe6] px-4 py-3.5 text-sm font-semibold text-[#0e0f0c] outline-none focus:border-[#0e0f0c] focus:bg-white transition-all"
                    >
                      {DRIVER_VEHICLE_TYPES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#454745] uppercase tracking-wider">City</label>
                    <select
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-lg border border-[#0e0f0c]/10 bg-[#e8ebe6] px-4 py-3.5 text-sm font-semibold text-[#0e0f0c] outline-none focus:border-[#0e0f0c] focus:bg-white transition-all"
                    >
                      <option value="" disabled>
                        Select your city
                      </option>
                      {SUPPORTED_CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {city.trim().length > 0 && (
                    <div className="rounded-lg bg-[#e2f6d5] border border-[#c5edab] p-3.5 space-y-1.5">
                      <p className="text-[11px] font-bold text-[#054d28] uppercase tracking-wider">
                        Documents required in {city.trim()}
                      </p>
                      {requiredDocuments.map((doc) => (
                        <div key={doc.key} className="flex items-center gap-2 text-xs font-semibold text-[#0e0f0c]">
                          {doc.required ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#054d28] shrink-0" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-[#454745]/50 shrink-0" />
                          )}
                          <span>{doc.label}</span>
                          {!doc.required && <span className="text-[#454745]">(if applicable)</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#454745] uppercase tracking-wider">Driving Licence (DL) number</label>
                    <input
                      required
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      className="w-full rounded-lg border border-[#0e0f0c]/10 bg-[#e8ebe6] px-4 py-3.5 text-sm font-semibold text-[#0e0f0c] outline-none focus:border-[#0e0f0c] focus:bg-white transition-all"
                      placeholder="DL-0420110149646"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#454745] uppercase tracking-wider">Vehicle Registration Certificate (RC) number</label>
                    <input
                      required
                      value={vehicleRegistrationNumber}
                      onChange={(e) => setVehicleRegistrationNumber(e.target.value)}
                      className="w-full rounded-lg border border-[#0e0f0c]/10 bg-[#e8ebe6] px-4 py-3.5 text-sm font-semibold text-[#0e0f0c] outline-none focus:border-[#0e0f0c] focus:bg-white transition-all"
                      placeholder="TS09EA1234"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#454745] uppercase tracking-wider">Insurance policy number</label>
                    <input
                      required
                      value={insurancePolicyNumber}
                      onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                      className="w-full rounded-lg border border-[#0e0f0c]/10 bg-[#e8ebe6] px-4 py-3.5 text-sm font-semibold text-[#0e0f0c] outline-none focus:border-[#0e0f0c] focus:bg-white transition-all"
                      placeholder="POL-889233445"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#454745] uppercase tracking-wider">
                      Commercial/taxi permit number {!permitRequired && '(optional)'}
                    </label>
                    <input
                      required={permitRequired}
                      value={permitNumber}
                      onChange={(e) => setPermitNumber(e.target.value)}
                      className="w-full rounded-lg border border-[#0e0f0c]/10 bg-[#e8ebe6] px-4 py-3.5 text-sm font-semibold text-[#0e0f0c] outline-none focus:border-[#0e0f0c] focus:bg-white transition-all"
                      placeholder="PMT-TS-2024-8871"
                    />
                  </div>
                </>
              )}
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#454745] uppercase tracking-wider">Password</label>
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[#0e0f0c]/10 bg-[#e8ebe6] px-4 py-3.5 text-sm font-semibold text-[#0e0f0c] outline-none focus:border-[#0e0f0c] focus:bg-white transition-all"
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-[#320707] px-4 py-3 text-sm font-bold text-white border border-[#a7000d]">
              {error}
            </div>
          )}

          {/* Wise Lime-Green #9fe870 Primary Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-[#9fe870] hover:bg-[#cdffad] active:bg-[#c5edab] text-[#0e0f0c] font-black text-base shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-[#0e0f0c]" />
            ) : mode === 'LOGIN' ? (
              <>
                <span>Log in</span>
                <ArrowRight className="h-5 w-5 stroke-[2.5]" />
              </>
            ) : (
              <>
                <span>Create account</span>
                <ArrowRight className="h-5 w-5 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm font-semibold text-[#454745]">
          {mode === 'LOGIN' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => {
              clearError();
              setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN');
            }}
            className="font-black text-[#0e0f0c] hover:underline underline-offset-4 cursor-pointer"
          >
            {mode === 'LOGIN' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
};
