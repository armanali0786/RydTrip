import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Car, User as UserIcon, Shield, Globe, Menu, X, Smartphone, Layers, Zap, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { wsClient, ConnectionState } from '../../websocket/client';
import { ConnectionBadge } from './Badge';

function initials(name: string | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
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

          {user && (
            <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-400 bg-slate-800 text-[10px] font-bold text-emerald-400">
                {initials(user.name)}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white leading-tight">{user.name}</div>
                <div className="text-[10px] font-semibold text-emerald-400 leading-tight capitalize">
                  {user.role.toLowerCase()}
                </div>
              </div>
              <button
                onClick={logout}
                aria-label="Log out"
                className="ml-1 flex items-center justify-center rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
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

          {user && (
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400 bg-slate-900 text-xs font-bold text-emerald-400">
                  {initials(user.name)}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{user.name}</div>
                  <div className="text-xs text-emerald-400 capitalize">{user.role.toLowerCase()}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-1.5 rounded-full bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" /> Log out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
