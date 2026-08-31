import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/ui/Navbar';
import { Footer } from '../components/ui/Footer';
import { HeroRideForm } from '../components/booking/HeroRideForm';
import { Button } from '../components/ui/Button';
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
} from 'lucide-react';

export const MarketingHome: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-text">
      <Navbar />

      {/* 1. HERO BAND (WHITE SURFACE) */}
      <section className="bg-canvas py-10 lg:py-16 border-b border-canvas-soft">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Hero Ride Form */}
            <div className="lg:col-span-6 z-10">
              <HeroRideForm onSearchSubmit={() => navigate('/rider')} />
            </div>

            {/* Right Column: Hero Editorial 4:3 Visual Frame */}
            <div className="lg:col-span-6 relative">
              <div className="relative overflow-hidden rounded-xl bg-canvas-soft shadow-card aspect-[4/3]">
                <img
                  src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&auto=format&fit=crop&q=80"
                  alt="Uber Rider Experience"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6 text-on-dark space-y-1">
                  <span className="inline-block rounded-pill bg-canvas/20 px-3 py-1 text-caption font-semibold backdrop-blur-md">
                    Urban Logistics Layer
                  </span>
                  <h3 className="font-display text-display-md text-on-dark">
                    Seamless dispatch across 10,000+ cities
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY CHIPS BAND */}
      <section className="bg-canvas py-8 border-b border-canvas-soft">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
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
                className={`flex shrink-0 items-center gap-2 rounded-pill px-5 py-3 text-body-sm-strong font-medium transition-all ${
                  chip.active
                    ? 'bg-primary text-on-dark shadow-sm'
                    : 'bg-canvas-soft text-ink hover:bg-surface-pressed'
                }`}
              >
                <span>{chip.icon}</span>
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. POLARITY-FLIPPED BLACK PROMO BAND (MID-PAGE DEPTH SHIFT) */}
      <section className="bg-primary text-on-dark py-16 lg:py-24">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Promo Left: Copy + White Secondary Pill CTA */}
            <div className="lg:col-span-6 space-y-6">
              <span className="text-caption font-semibold uppercase tracking-wider text-canvas-soft">
                WHY BECOME A DRIVER
              </span>
              <h2 className="font-display text-display-xxl text-on-dark leading-tight">
                Drive when you want, make what you need
              </h2>
              <p className="text-body-lg text-canvas-soft/80 leading-relaxed">
                Earn on your own schedule. Set your preferences, track earnings in real-time, and get cashouts on demand.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Button variant="secondary" size="lg" onClick={() => navigate('/driver')}>
                  Get started as driver
                </Button>
                <Button
                  variant="subtle"
                  size="lg"
                  className="bg-black-elevated text-on-dark hover:bg-canvas/10"
                  onClick={() => navigate('/dual')}
                >
                  Try Dual Dispatch Demo
                </Button>
              </div>
            </div>

            {/* Promo Right: 4:3 Editorial Image */}
            <div className="lg:col-span-6">
              <div className="overflow-hidden rounded-xl border border-black-elevated aspect-[4/3]">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80"
                  alt="Driver Experience"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURE CARDS GRID (WHITE SURFACE) */}
      <section className="bg-canvas py-16 lg:py-24 border-b border-canvas-soft">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-2xl">
            <span className="text-caption font-semibold uppercase tracking-wider text-body">
              BUILT FOR URBAN MOBILITY
            </span>
            <h2 className="font-display text-display-xl text-ink mt-2">
              Safety, simplicity, and scale
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-xl bg-canvas p-6 shadow-subtle border border-canvas-soft space-y-4">
              <div className="h-12 w-12 rounded-full bg-canvas-soft flex items-center justify-center text-primary font-bold text-xl">
                🛡️
              </div>
              <h3 className="font-display text-display-sm text-ink">Safety, simplified</h3>
              <p className="text-body-md text-body">
                24/7 incident response, GPS tracking on every trip, and emergency assistance right in the app.
              </p>
            </div>

            <div className="rounded-xl bg-canvas p-6 shadow-subtle border border-canvas-soft space-y-4">
              <div className="h-12 w-12 rounded-full bg-canvas-soft flex items-center justify-center text-primary font-bold text-xl">
                ⏰
              </div>
              <h3 className="font-display text-display-sm text-ink">Plan for later with Reserve</h3>
              <p className="text-body-md text-body">
                Book your ride up to 90 days in advance so you can step into your day with peace of mind.
              </p>
            </div>

            <div className="rounded-xl bg-canvas p-6 shadow-subtle border border-canvas-soft space-y-4">
              <div className="h-12 w-12 rounded-full bg-canvas-soft flex items-center justify-center text-primary font-bold text-xl">
                ⚡
              </div>
              <h3 className="font-display text-display-sm text-ink">Real-time matching engine</h3>
              <p className="text-body-md text-body">
                Powered by RideMesh distributed dispatch, Redis GEO indexing, and low-latency WebSockets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ANNUAL SHOWCASE CARD (GO•GET 2026) */}
      <section className="bg-canvas py-16">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-xl bg-primary text-on-dark p-8 lg:p-14 shadow-card">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-4">
                <span className="inline-block rounded-pill bg-canvas/10 px-3 py-1 text-caption font-semibold tracking-widest text-canvas uppercase">
                  GO•GET 2026 SHOWCASE
                </span>
                <h2 className="font-display text-display-xxl text-on-dark leading-tight">
                  Next-generation dispatch & urban logistics
                </h2>
                <p className="text-body-lg text-canvas-soft/80 max-w-xl">
                  Discover how RideMesh powers zero-emissions fleet dispatch, autonomous vehicle handoffs, and instant real-time driver tracking.
                </p>
                <div className="pt-2">
                  <Button variant="secondary" size="lg" onClick={() => navigate('/dual')}>
                    Launch Interactive Platform Demo <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-4 flex justify-center">
                <div className="h-48 w-48 rounded-full border-4 border-canvas-soft/20 flex items-center justify-center text-6xl animate-pulse">
                  🚗⚡
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. APP DOWNLOAD PILLS BAND */}
      <section className="bg-canvas-soft py-16 border-t border-canvas-soft">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="font-display text-display-lg text-ink">
            It's easier in the apps
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="primary" size="lg" onClick={() => navigate('/rider')}>
              <Smartphone className="h-5 w-5 mr-2" />
              Download the Rider App
            </Button>
            <Button variant="primary" size="lg" onClick={() => navigate('/driver')}>
              <Smartphone className="h-5 w-5 mr-2" />
              Download the Driver App
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
