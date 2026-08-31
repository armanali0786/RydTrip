import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/ui/Navbar';
import { Footer } from '../components/ui/Footer';
import { HeroRideForm } from '../components/booking/HeroRideForm';
import {
  Car,
  Key,
  Calendar,
  Clock,
  Shield,
  Smartphone,
  ArrowRight,
  Sparkles,
  Users,
  Award,
  ChevronRight,
  Zap,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Navigation,
} from 'lucide-react';

export const MarketingHome: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-text">
      <Navbar />

      {/* 1. HERO SECTION */}
      <section className="bg-white py-10 lg:py-16 border-b border-slate-200/80">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Hero Ride Form */}
            <div className="lg:col-span-6 z-10 flex justify-center lg:justify-start">
              <HeroRideForm onSearchSubmit={() => navigate('/rider')} />
            </div>

            {/* Right Column: Hero Visual Showcase */}
            <div className="lg:col-span-6 relative">
              <div className="relative overflow-hidden rounded-2xl bg-slate-900 shadow-card aspect-[4/3] group">
                <img
                  src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&auto=format&fit=crop&q=80"
                  alt="RydTrip Experience"
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3.5 py-1 text-xs font-bold text-emerald-300 backdrop-blur-md">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                    Live Dispatch GPS Engine
                  </span>
                  <h3 className="font-display text-2xl font-bold text-white">
                    Seamless ride dispatch across 10,000+ cities
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY CHIPS BAND */}
      <section className="bg-white py-6 border-b border-slate-200/80">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
            {[
              { label: 'Ride', icon: '🚗', active: true },
              { label: 'Drive', icon: '🚘' },
              { label: 'Reserve', icon: '⏰' },
              { label: 'Rentals', icon: '🔑' },
              { label: 'Courier / Package', icon: '📦' },
              { label: 'Group Rides', icon: '👥' },
              { label: 'Teen Accounts', icon: '🎓' },
            ].map((chip) => (
              <button
                key={chip.label}
                onClick={() => navigate('/rider')}
                className={`flex shrink-0 items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-bold transition-all cursor-pointer ${
                  chip.active
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                <span className="text-base">{chip.icon}</span>
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. REDESIGNED DRIVER SHOWCASE SECTION (Modern Gradient Card Layout) */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1240px] rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 p-8 lg:p-14 shadow-2xl border border-slate-800 text-white relative overflow-hidden">
          {/* Subtle Ambient Background Gradients */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy Column */}
            <div className="lg:col-span-6 space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-4 py-1.5 text-xs font-extrabold text-emerald-400 uppercase tracking-widest">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                Driver Partner Network
              </span>

              <h2 className="font-display text-4xl lg:text-5xl font-black text-white leading-tight">
                Drive on your terms, earn on every trip
              </h2>

              <p className="text-base lg:text-lg text-slate-300 leading-relaxed">
                Take control of your schedule. High demand routes, transparent fare breakdown, instant cashouts, and 24/7 dedicated support.
              </p>

              {/* Earnings Highlights Grid */}
              <div className="grid grid-cols-3 gap-4 py-3 border-y border-slate-800/80">
                <div>
                  <div className="text-2xl font-black text-emerald-400">₹450/hr</div>
                  <div className="text-xs font-semibold text-slate-400">Peak Avg. Earnings</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-cyan-400">Instant</div>
                  <div className="text-xs font-semibold text-slate-400">Daily Payouts</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white">100%</div>
                  <div className="text-xs font-semibold text-slate-400">Flexible Hours</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  onClick={() => navigate('/driver')}
                  className="px-7 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-base shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <span>Sign up to Drive</span>
                  <ArrowRight className="h-5 w-5" />
                </button>

                <button
                  onClick={() => navigate('/dual')}
                  className="px-7 py-4 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-base border border-slate-700 flex items-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <Zap className="h-4 w-4 text-emerald-400" />
                  <span>Try Dispatch Simulator</span>
                </button>
              </div>
            </div>

            {/* Right Visual Column: Live Interactive Driver Dashboard Mockup Card */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl bg-slate-900/90 border border-slate-700/80 p-6 shadow-2xl space-y-5 backdrop-blur-md">
                {/* Header Driver Status Bar */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
                        alt="Rahul Sharma"
                        className="h-11 w-11 rounded-full object-cover border-2 border-emerald-400"
                      />
                      <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-slate-900"></span>
                    </div>
                    <div>
                      <div className="font-bold text-white text-base">Rahul Sharma</div>
                      <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                        <span>● ONLINE</span> • <span>Sedan (RydTrip Premier)</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-400">Today's Earnings</div>
                    <div className="text-xl font-black text-emerald-400">₹2,840</div>
                  </div>
                </div>

                {/* Simulated Live Dispatch Incoming Trip Request Overlay */}
                <div className="rounded-xl bg-slate-800/80 p-4 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                      ⚡ Incoming Trip Request
                    </span>
                    <span className="text-xs font-bold text-amber-400">12s left</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-bold text-white">Pickup: Hitec City Metro</div>
                      <div className="text-xs text-slate-400">Dropoff: Airport (HYD) • 28.4 km</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-white">₹580</div>
                      <div className="text-[11px] font-semibold text-slate-400">Estimated fare</div>
                    </div>
                  </div>

                  {/* Accept / Decline Action Simulation */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      onClick={() => navigate('/driver')}
                      className="py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md transition-all text-center"
                    >
                      ACCEPT RIDE (12s)
                    </button>
                    <button
                      onClick={() => navigate('/driver')}
                      className="py-2.5 px-4 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-xs transition-all text-center"
                    >
                      DECLINE
                    </button>
                  </div>
                </div>

                {/* Driver Benefits Badges */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-800/50 p-2.5 rounded-lg border border-slate-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Fuel & EV Discounts</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-800/50 p-2.5 rounded-lg border border-slate-800">
                    <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Free Commercial Insurance</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURE CARDS GRID */}
      <section className="bg-white py-16 border-y border-slate-200/80">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              DISTRIBUTED MOBILITY ENGINE
            </span>
            <h2 className="font-display text-3xl font-extrabold text-slate-900 mt-1">
              Safety, speed, and real-time precision
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl bg-slate-50 p-7 border border-slate-200/80 space-y-4 hover:border-slate-300 transition-all">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-2xl">
                🛡️
              </div>
              <h3 className="font-display text-xl font-bold text-slate-900">Safety, simplified</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                24/7 incident response, live GPS route tracking on every ride, and emergency support embedded in-app.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-7 border border-slate-200/80 space-y-4 hover:border-slate-300 transition-all">
              <div className="h-12 w-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-2xl">
                ⏰
              </div>
              <h3 className="font-display text-xl font-bold text-slate-900">Reserve in advance</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Book your ride up to 90 days ahead so you can travel stress-free with locked-in driver availability.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-7 border border-slate-200/80 space-y-4 hover:border-slate-300 transition-all">
              <div className="h-12 w-12 rounded-xl bg-cyan-100 flex items-center justify-center text-cyan-700 font-bold text-2xl">
                ⚡
              </div>
              <h3 className="font-display text-xl font-bold text-slate-900">Real-time matching</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Powered by RydTrip GEO indexing engine, WebSocket live streams, and instant driver matching algorithms.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. APP DOWNLOAD BUTTONS BAND */}
      <section className="bg-slate-100 py-16 border-b border-slate-200">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="font-display text-3xl font-extrabold text-slate-900">
            It's easier in the apps
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate('/rider')}
              className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold text-base shadow-md hover:shadow-emerald-500/20 flex items-center gap-2.5 transition-all cursor-pointer active:scale-[0.98]"
            >
              <Smartphone className="h-5 w-5" />
              <span>Download Rider App</span>
            </button>

            <button
              onClick={() => navigate('/driver')}
              className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base shadow-md hover:shadow-emerald-500/20 flex items-center gap-2.5 transition-all cursor-pointer active:scale-[0.98]"
            >
              <Smartphone className="h-5 w-5" />
              <span>Download Driver App</span>
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
