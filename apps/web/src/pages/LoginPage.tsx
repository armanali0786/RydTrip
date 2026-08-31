import React, { useState } from 'react';
import { Car, Loader2, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';

const DRIVER_VEHICLE_TYPES = ['SEDAN', 'SUV', 'HATCHBACK', 'AUTO', 'BIKE'] as const;

interface LoginPageProps {
  requiredRole?: 'RIDER' | 'DRIVER';
}

export const LoginPage: React.FC<LoginPageProps> = ({ requiredRole }) => {
  const { login, register, isLoading, error, clearError } = useAuthStore();

  const [role, setRole] = useState<'RIDER' | 'DRIVER'>(requiredRole ?? 'RIDER');
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
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
      // error handled in store
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center font-text p-4">
      <div className="w-full max-w-[420px] space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Car className="h-8 w-8 text-emerald-600" />
            <span className="font-display text-3xl font-black text-slate-900 tracking-tight">RydTrip</span>
          </div>
          <p className="text-sm font-medium text-slate-500 text-center">
            {mode === 'LOGIN' ? 'Log in to continue your journey' : 'Create an account to get started'}
          </p>
        </div>

        {/* Role toggle segment control */}
        <div className="flex items-center rounded-2xl bg-slate-200/80 p-1.5 border border-slate-300/50">
          {(['RIDER', 'DRIVER'] as const).map((r) => (
            <button
              key={r}
              type="button"
              disabled={!!requiredRole}
              onClick={() => setRole(r)}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-all cursor-pointer ${
                role === r
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
              }`}
            >
              {r === 'RIDER' ? 'Rider' : 'Driver'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-6 md:p-8 shadow-card border border-slate-100">
          {mode === 'REGISTER' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="Priya Sharma"
              />
            </div>
          )}

          {mode === 'LOGIN' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email or phone</label>
              <input
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                placeholder="priya@example.com or +919876543210"
              />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="priya@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</label>
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="+919876543210"
                />
              </div>
              {role === 'DRIVER' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vehicle type</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
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
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all"
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold text-base shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : mode === 'LOGIN' ? (
              <>
                <span>Log in</span>
                <ArrowRight className="h-5 w-5" />
              </>
            ) : (
              <>
                <span>Create account</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm font-medium text-slate-600">
          {mode === 'LOGIN' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => {
              clearError();
              setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN');
            }}
            className="font-bold text-slate-900 hover:text-emerald-600 underline underline-offset-4 transition-colors cursor-pointer"
          >
            {mode === 'LOGIN' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
};
