import React, { useState } from 'react';
import { Car, Loader2 } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { Button } from '../components/ui/Button';

const DRIVER_VEHICLE_TYPES = ['SEDAN', 'SUV', 'HATCHBACK', 'AUTO', 'BIKE'] as const;

interface LoginPageProps {
  /** Locks the role tab when this page was reached via RequireAuth on a role-specific route. */
  requiredRole?: 'RIDER' | 'DRIVER';
}

export const LoginPage: React.FC<LoginPageProps> = ({ requiredRole }) => {
  const { login, register, isLoading, error, clearError } = useAuthStore();

  const [role, setRole] = useState<'RIDER' | 'DRIVER'>(requiredRole ?? 'RIDER');
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState(''); // login: email or phone
  const [email, setEmail] = useState(''); // register
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleType, setVehicleType] = useState<string>(DRIVER_VEHICLE_TYPES[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      if (mode === 'LOGIN') {
        await login(role, identifier, password);
      } else {
        await register(role, {
          name,
          email,
          phone,
          password,
          ...(role === 'DRIVER' ? { vehicleType } : {}),
        });
      }
    } catch {
      // error is already surfaced via the store's `error` field
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex items-center justify-center font-text p-4">
      <div className="w-full max-w-[420px] space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Car className="h-7 w-7 text-primary" />
            <span className="font-display text-display-md text-ink">RydTrip</span>
          </div>
          <p className="text-body-sm text-body text-center">
            {mode === 'LOGIN' ? 'Log in to continue' : 'Create an account to get started'}
          </p>
        </div>

        {/* Role toggle */}
        <div className="flex items-center rounded-pill bg-canvas-soft p-1 border border-canvas-softer">
          {(['RIDER', 'DRIVER'] as const).map((r) => (
            <button
              key={r}
              type="button"
              disabled={!!requiredRole}
              onClick={() => setRole(r)}
              className={`flex-1 rounded-pill px-3 py-2 text-body-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                role === r ? 'bg-canvas text-ink shadow-sm' : 'text-body hover:text-ink'
              }`}
            >
              {r === 'RIDER' ? 'Rider' : 'Driver'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-canvas p-6 shadow-card border border-canvas-soft">
          {mode === 'REGISTER' && (
            <div className="space-y-1.5">
              <label className="text-caption font-semibold text-mute uppercase">Full name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-canvas-soft bg-canvas-soft/40 px-3.5 py-2.5 text-body-sm text-ink outline-none focus:border-primary"
                placeholder="Priya Sharma"
              />
            </div>
          )}

          {mode === 'LOGIN' ? (
            <div className="space-y-1.5">
              <label className="text-caption font-semibold text-mute uppercase">Email or phone</label>
              <input
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full rounded-lg border border-canvas-soft bg-canvas-soft/40 px-3.5 py-2.5 text-body-sm text-ink outline-none focus:border-primary"
                placeholder="priya@example.com or +919876543210"
              />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-caption font-semibold text-mute uppercase">Email</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-canvas-soft bg-canvas-soft/40 px-3.5 py-2.5 text-body-sm text-ink outline-none focus:border-primary"
                  placeholder="priya@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-caption font-semibold text-mute uppercase">Phone</label>
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-canvas-soft bg-canvas-soft/40 px-3.5 py-2.5 text-body-sm text-ink outline-none focus:border-primary"
                  placeholder="+919876543210"
                />
              </div>
              {role === 'DRIVER' && (
                <div className="space-y-1.5">
                  <label className="text-caption font-semibold text-mute uppercase">Vehicle type</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full rounded-lg border border-canvas-soft bg-canvas-soft/40 px-3.5 py-2.5 text-body-sm text-ink outline-none focus:border-primary"
                  >
                    {DRIVER_VEHICLE_TYPES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-caption font-semibold text-mute uppercase">Password</label>
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-canvas-soft bg-canvas-soft/40 px-3.5 py-2.5 text-body-sm text-ink outline-none focus:border-primary"
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-body-sm text-red-700 border border-red-100">
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" fullWidth disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === 'LOGIN' ? (
              'Log in'
            ) : (
              'Create account'
            )}
          </Button>
        </form>

        <p className="text-center text-body-sm text-body">
          {mode === 'LOGIN' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => {
              clearError();
              setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN');
            }}
            className="font-semibold text-ink underline underline-offset-4"
          >
            {mode === 'LOGIN' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
};
