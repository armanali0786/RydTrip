import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User as UserIcon, Menu, X, Zap, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { wsClient, ConnectionState } from '../../websocket/client';
import { ConnectionBadge } from './Badge';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [connectionState, setConnectionState] = useState<ConnectionState>('CONNECTED');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = wsClient.onStateChange((st) => setConnectionState(st));
    return unsub;
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white text-[#0e0f0c] border-b border-[#0e0f0c]/10 shadow-subtle">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Left Section: Brand Logo + Nav Links */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-display text-2xl font-black tracking-tight text-[#0e0f0c] group-hover:text-[#0e0f0c]/80 transition-colors">
              RydTrip
            </span>
            <span className="rounded-full bg-[#e2f6d5] border border-[#c5edab] px-2.5 py-0.5 text-[11px] font-bold text-[#054d28] uppercase tracking-wider">
              Live
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
            <Link
              to="/rider"
              className={`hover:text-[#0e0f0c] transition-colors ${
                location.pathname === '/rider' ? 'text-[#0e0f0c] font-extrabold underline underline-offset-8' : 'text-[#454745]'
              }`}
            >
              Ride
            </Link>
            <Link
              to="/driver"
              className={`hover:text-[#0e0f0c] transition-colors ${
                location.pathname === '/driver' ? 'text-[#0e0f0c] font-extrabold underline underline-offset-8' : 'text-[#454745]'
              }`}
            >
              Drive
            </Link>
            <Link
              to="/dual"
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                location.pathname === '/dual'
                  ? 'bg-[#9fe870] text-[#0e0f0c] shadow-sm font-extrabold'
                  : 'bg-[#e8ebe6] text-[#0e0f0c] hover:bg-[#d8dcd5]'
              }`}
            >
              <Zap className="h-3.5 w-3.5 fill-current text-[#0e0f0c]" />
              <span>Dual Dispatch Mode</span>
            </Link>
            <Link
              to="/history"
              className="text-[#454745] hover:text-[#0e0f0c] transition-colors"
            >
              Activity
            </Link>
          </nav>
        </div>

        {/* Right Section: Live Badge + Auth */}
        <div className="hidden sm:flex items-center gap-4">
          <ConnectionBadge state={connectionState} />

          {isAuthenticated && user ? (
            <div className="flex items-center gap-2.5 bg-[#e8ebe6] border border-[#0e0f0c]/10 px-3.5 py-1.5 rounded-xl">
              <Link to="/profile" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity" title="View profile">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-7 w-7 rounded-full border border-[#0e0f0c] object-cover"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full border border-[#0e0f0c] bg-white flex items-center justify-center text-[10px] font-black text-[#0e0f0c]">
                    {initials(user.name)}
                  </div>
                )}
                <div className="text-left">
                  <div className="text-xs font-bold text-[#0e0f0c] leading-tight">{user.name}</div>
                  <div className="text-[10px] font-semibold text-[#454745] leading-tight uppercase tracking-wider">
                    {user.role}
                  </div>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                title="Log out"
                className="ml-1 p-1.5 text-[#454745] hover:text-[#0e0f0c] hover:bg-white rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 bg-[#0e0f0c] hover:bg-[#0e0f0c]/85 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
            >
              <UserIcon className="h-4 w-4" />
              Log in
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="sm:hidden p-2 text-[#0e0f0c] hover:bg-[#e8ebe6] rounded-xl"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-[#0e0f0c]/10 bg-white px-6 py-6 space-y-4">
          <div className="flex flex-col gap-3 font-semibold text-[#0e0f0c]">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-bold hover:text-[#054d28]"
            >
              Home
            </Link>
            <Link
              to="/rider"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-bold hover:text-[#054d28]"
            >
              Rider Web App
            </Link>
            <Link
              to="/driver"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-bold hover:text-[#054d28]"
            >
              Driver Web App
            </Link>
            <Link
              to="/dual"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base text-[#0e0f0c] font-bold flex items-center gap-2 bg-[#9fe870] p-3 rounded-xl"
            >
              <Zap className="h-4 w-4" /> Dual Dispatch Mode
            </Link>
            <Link
              to="/history"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-bold hover:text-[#054d28]"
            >
              Activity
            </Link>
            {isAuthenticated && (
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-bold hover:text-[#054d28]"
              >
                Profile
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
