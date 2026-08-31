import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Car, User as UserIcon, Shield, Globe, Menu, X, Smartphone, Layers, Zap } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { wsClient, ConnectionState } from '../../websocket/client';
import { ConnectionBadge } from './Badge';

export const Navbar: React.FC = () => {
  const { user, role, setRole } = useAuthStore();
  const location = useLocation();
  const [connectionState, setConnectionState] = useState<ConnectionState>('CONNECTED');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = wsClient.onStateChange((st) => setConnectionState(st));
    return unsub;
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-slate-950 text-white shadow-lg border-b border-slate-800">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Left Section: Brand Logo + Nav Links */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-display text-2xl font-black tracking-tight text-white group-hover:text-emerald-400 transition-colors">
              RydTrip
            </span>
            <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
              Live
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
            <Link
              to="/rider"
              className={`hover:text-emerald-400 transition-colors ${
                location.pathname === '/rider' ? 'text-emerald-400 font-bold underline underline-offset-8' : 'text-slate-300'
              }`}
            >
              Ride
            </Link>
            <Link
              to="/driver"
              className={`hover:text-emerald-400 transition-colors ${
                location.pathname === '/driver' ? 'text-emerald-400 font-bold underline underline-offset-8' : 'text-slate-300'
              }`}
            >
              Drive
            </Link>
            <Link
              to="/dual"
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                location.pathname === '/dual'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
              }`}
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              <span>Dual Dispatch Mode</span>
            </Link>
            <Link
              to="/history"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Activity
            </Link>
          </nav>
        </div>

        {/* Right Section: Live Badge + Switcher + User Info */}
        <div className="hidden sm:flex items-center gap-4">
          <ConnectionBadge state={connectionState} />

          {/* Role Switcher */}
          <div className="flex items-center rounded-full bg-slate-900 p-1 border border-slate-800">
            <button
              onClick={() => setRole('RIDER')}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                role === 'RIDER'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Rider
            </button>
            <button
              onClick={() => setRole('DRIVER')}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                role === 'DRIVER'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Driver
            </button>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
            <img
              src={user?.avatar}
              alt={user?.name}
              className="h-7 w-7 rounded-full border border-emerald-400 object-cover"
            />
            <div className="text-left">
              <div className="text-xs font-bold text-white leading-tight">{user?.name}</div>
              <div className="text-[10px] font-semibold text-emerald-400 leading-tight">
                ⭐ {user?.rating} • {user?.role}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="sm:hidden p-2 text-white hover:bg-slate-800 rounded-full"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-800 bg-slate-950 px-6 py-6 space-y-4">
          <div className="flex flex-col gap-3 font-semibold">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base text-white hover:text-emerald-400"
            >
              Home
            </Link>
            <Link
              to="/rider"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base text-white hover:text-emerald-400"
            >
              Rider Web App
            </Link>
            <Link
              to="/driver"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base text-white hover:text-emerald-400"
            >
              Driver Web App
            </Link>
            <Link
              to="/dual"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base text-emerald-400 font-bold flex items-center gap-2"
            >
              <Zap className="h-4 w-4" /> Dual Dispatch Split Mode
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
