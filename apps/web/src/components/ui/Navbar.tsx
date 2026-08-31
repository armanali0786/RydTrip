import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Car, User as UserIcon, Shield, Globe, Menu, X, Smartphone, Layers } from 'lucide-react';
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
    <header className="sticky top-0 z-50 bg-primary text-on-dark shadow-md">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-3.5 sm:px-8">
        {/* Left Section: Brand + Navigation Links */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-[26px] tracking-tight text-on-dark hover:opacity-90 transition-opacity">
              Uber
            </span>
            <span className="rounded-pill bg-canvas-soft/20 px-2 py-0.5 text-[10px] font-semibold text-canvas uppercase tracking-wider">
              RideMesh
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-body-md font-medium">
            <Link
              to="/rider"
              className={`hover:text-canvas transition-colors ${
                location.pathname === '/rider' ? 'text-on-dark font-semibold underline underline-offset-8' : 'text-canvas-soft/80'
              }`}
            >
              Ride
            </Link>
            <Link
              to="/driver"
              className={`hover:text-canvas transition-colors ${
                location.pathname === '/driver' ? 'text-on-dark font-semibold underline underline-offset-8' : 'text-canvas-soft/80'
              }`}
            >
              Drive
            </Link>
            <Link
              to="/dual"
              className={`flex items-center gap-1.5 rounded-pill bg-canvas/10 px-3 py-1 text-body-sm font-medium hover:bg-canvas/20 transition-all ${
                location.pathname === '/dual' ? 'bg-canvas text-primary font-semibold' : 'text-on-dark'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Dual Dispatch Mode</span>
            </Link>
            <Link
              to="/history"
              className="text-canvas-soft/80 hover:text-canvas transition-colors"
            >
              Activity
            </Link>
          </nav>
        </div>

        {/* Right Section: Status + Mode Pill + User Info */}
        <div className="hidden sm:flex items-center gap-4">
          <ConnectionBadge state={connectionState} />

          {/* Role Mode Switcher Pill */}
          <div className="flex items-center rounded-pill bg-canvas-soft/10 p-1 border border-canvas-soft/20">
            <button
              onClick={() => setRole('RIDER')}
              className={`rounded-pill px-3 py-1 text-caption font-medium transition-all ${
                role === 'RIDER' ? 'bg-canvas text-primary font-bold shadow-sm' : 'text-canvas-soft hover:text-canvas'
              }`}
            >
              Rider
            </button>
            <button
              onClick={() => setRole('DRIVER')}
              className={`rounded-pill px-3 py-1 text-caption font-medium transition-all ${
                role === 'DRIVER' ? 'bg-canvas text-primary font-bold shadow-sm' : 'text-canvas-soft hover:text-canvas'
              }`}
            >
              Driver
            </button>
          </div>

          <div className="flex items-center gap-2">
            <img
              src={user?.avatar}
              alt={user?.name}
              className="h-8 w-8 rounded-full border border-canvas/20 object-cover"
            />
            <div className="text-left">
              <div className="text-caption font-semibold text-on-dark leading-tight">{user?.name}</div>
              <div className="text-[11px] text-canvas-soft/70 leading-tight">
                ⭐ {user?.rating} • {user?.role}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="sm:hidden p-2 text-on-dark hover:bg-canvas/10 rounded-pill"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-canvas-soft/10 bg-primary px-6 py-6 space-y-4">
          <div className="flex flex-col gap-3 font-medium">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="text-body-lg text-on-dark hover:text-canvas"
            >
              Home Marketing
            </Link>
            <Link
              to="/rider"
              onClick={() => setMobileMenuOpen(false)}
              className="text-body-lg text-on-dark hover:text-canvas"
            >
              Rider Web
            </Link>
            <Link
              to="/driver"
              onClick={() => setMobileMenuOpen(false)}
              className="text-body-lg text-on-dark hover:text-canvas"
            >
              Driver Web
            </Link>
            <Link
              to="/dual"
              onClick={() => setMobileMenuOpen(false)}
              className="text-body-lg text-emerald-400 font-semibold"
            >
              ⚡ Dual Dispatch Mode (Split View)
            </Link>
          </div>

          <div className="pt-4 border-t border-canvas-soft/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={user?.avatar} alt={user?.name} className="h-10 w-10 rounded-full object-cover" />
              <div>
                <div className="text-body-md font-bold text-on-dark">{user?.name}</div>
                <div className="text-caption text-canvas-soft/70">Role: {user?.role}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
