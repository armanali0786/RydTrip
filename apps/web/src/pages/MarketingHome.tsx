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
    <div className="min-h-screen bg-[#e8ebe6] text-[#0e0f0c] flex flex-col font-text">
      <Navbar />

      {/* 1. SAGE HERO BAND ({colors.canvas-soft} #e8ebe6) */}
      <section className="bg-[#e8ebe6] py-12 lg:py-20 border-b border-[#0e0f0c]/10">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Hero Ride Form (White Card sitting on Sage Canvas) */}
            <div className="lg:col-span-6 z-10 flex justify-center lg:justify-start">
              <HeroRideForm onSearchSubmit={() => navigate('/rider')} />
            </div>

            {/* Right Column: Wise Hero Headline & Visual Card */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#e2f6d5] border border-[#c5edab] px-4 py-1.5 text-xs font-extrabold text-[#054d28]">
                <span className="h-2 w-2 rounded-full bg-[#2ead4b] animate-ping"></span>
                The friendly fintech-powered ride network
              </div>

              <h1 className="font-display text-5xl lg:text-6xl font-black text-[#0e0f0c] leading-[1.05] tracking-tight">
                Move money, book rides, travel anywhere.
              </h1>

              <p className="text-lg font-medium text-[#454745] leading-relaxed max-w-lg">
                RydTrip pairs real-time dispatch with zero hidden fees. Fair pricing, live driver tracking, and instant bookings.
              </p>

              {/* Wise White Visual Card */}
              <div className="relative overflow-hidden rounded-xl bg-white p-4 shadow-card border border-[#0e0f0c]/10 aspect-[16/9]">
                <img
                  src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&auto=format&fit=crop&q=80"
                  alt="RydTrip Experience"
                  className="h-full w-full object-cover rounded-lg"
                />
                <div className="absolute bottom-6 left-6 right-6 bg-[#0e0f0c]/90 backdrop-blur-md p-4 rounded-xl text-white flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[#9fe870]">10,000+ CITIES</div>
                    <div className="font-bold text-sm">Instant Driver Dispatch Active</div>
                  </div>
                  <button
                    onClick={() => navigate('/rider')}
                    className="px-4 py-2 rounded-lg bg-[#9fe870] hover:bg-[#cdffad] text-[#0e0f0c] font-bold text-xs cursor-pointer"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY CHIPS BAND */}
      <section className="bg-white py-6 border-b border-[#0e0f0c]/10">
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
                className={`flex shrink-0 items-center gap-2.5 rounded-xl px-5 py-3 text-sm font-bold transition-all cursor-pointer ${
                  chip.active
                    ? 'bg-[#9fe870] text-[#0e0f0c] shadow-sm'
                    : 'bg-[#e8ebe6] text-[#0e0f0c] hover:bg-[#d8dcd5]'
                }`}
              >
                <span className="text-base">{chip.icon}</span>
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. WISE POLARITY-FLIPPED DARK PROMO CARD (Background {colors.ink} #0e0f0c, Text {colors.primary} #9fe870) */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1240px] rounded-xl bg-[#0e0f0c] p-8 lg:p-14 text-white relative overflow-hidden shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#163300] border border-[#9fe870]/30 px-4 py-1.5 text-xs font-extrabold text-[#9fe870] uppercase tracking-wider">
                DRIVER PARTNER PROGRAM
              </span>

              <h2 className="font-display text-4xl lg:text-5xl font-black text-white leading-tight">
                Drive when you want, earn <span className="text-[#9fe870]">transparently</span>
              </h2>

              <p className="text-lg text-[#e8ebe6] leading-relaxed max-w-lg font-medium">
                Set your own schedule. Track earnings live, receive 100% of driver tips, and get instant payouts every single day.
              </p>

              {/* Wise Stat Badges */}
              <div className="grid grid-cols-3 gap-4 py-4 border-y border-white/10">
                <div>
                  <div className="text-2xl font-black text-[#9fe870]">₹450/hr</div>
                  <div className="text-xs font-semibold text-[#868685]">Peak Average</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-[#38c8ff]">Instant</div>
                  <div className="text-xs font-semibold text-[#868685]">Daily Payouts</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-white">0% Fee</div>
                  <div className="text-xs font-semibold text-[#868685]">Hidden Charges</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  onClick={() => navigate('/driver')}
                  className="px-7 py-4 rounded-xl bg-[#9fe870] hover:bg-[#cdffad] text-[#0e0f0c] font-black text-base transition-all cursor-pointer"
                >
                  Sign up to Drive
                </button>

                <button
                  onClick={() => navigate('/dual')}
                  className="px-7 py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-base border border-white/20 transition-all cursor-pointer"
                >
                  Try Dual Dispatch Demo
                </button>
              </div>
            </div>

            {/* Right Visual: Driver Card */}
            <div className="lg:col-span-5">
              <div className="rounded-xl bg-white text-[#0e0f0c] p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#0e0f0c]/10 pb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
                      alt="Rahul Sharma"
                      className="h-12 w-12 rounded-full object-cover border-2 border-[#0e0f0c]"
                    />
                    <div>
                      <div className="font-extrabold text-base text-[#0e0f0c]">Rahul Sharma</div>
                      <div className="text-xs font-semibold text-[#054d28]">⭐ 4.88 Driver Partner</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#e2f6d5] px-3 py-1 text-xs font-bold text-[#054d28]">ONLINE</span>
                </div>

                <div className="bg-[#e8ebe6] p-4 rounded-xl space-y-2 text-sm font-semibold">
                  <div className="flex justify-between">
                    <span className="text-[#454745]">Today's Earnings</span>
                    <span className="font-extrabold text-[#0e0f0c]">₹2,840</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#454745]">Completed Trips</span>
                    <span className="font-bold text-[#054d28]">12 rides</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURE CARDS GRID (Sage Canvas with White Cards) */}
      <section className="bg-[#e8ebe6] py-16 border-y border-[#0e0f0c]/10">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#054d28]">
              TRANSPARENT FINTECH RIDE SYSTEM
            </span>
            <h2 className="font-display text-4xl font-black text-[#0e0f0c] mt-1">
              Friendly, fast, and completely clear
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-xl bg-white p-8 border border-[#0e0f0c]/10 shadow-sm space-y-4">
              <div className="h-12 w-12 rounded-xl bg-[#e2f6d5] flex items-center justify-center text-[#054d28] font-black text-2xl">
                🛡️
              </div>
              <h3 className="font-display text-2xl font-black text-[#0e0f0c]">Safety first</h3>
              <p className="text-sm text-[#454745] leading-relaxed font-medium">
                24/7 emergency support, verified driver identity checks, and live GPS sharing on every ride.
              </p>
            </div>

            <div className="rounded-xl bg-white p-8 border border-[#0e0f0c]/10 shadow-sm space-y-4">
              <div className="h-12 w-12 rounded-xl bg-[#ffc091]/30 flex items-center justify-center text-[#0e0f0c] font-black text-2xl">
                ⏰
              </div>
              <h3 className="font-display text-2xl font-black text-[#0e0f0c]">Reserve in advance</h3>
              <p className="text-sm text-[#454745] leading-relaxed font-medium">
                Lock in your pickup time up to 90 days ahead with guaranteed driver availability.
              </p>
            </div>

            <div className="rounded-xl bg-white p-8 border border-[#0e0f0c]/10 shadow-sm space-y-4">
              <div className="h-12 w-12 rounded-xl bg-[#38c8ff]/30 flex items-center justify-center text-[#0e0f0c] font-black text-2xl">
                ⚡
              </div>
              <h3 className="font-display text-2xl font-black text-[#0e0f0c]">No surge markup</h3>
              <p className="text-sm text-[#454745] leading-relaxed font-medium">
                Transparent price calculation based on distance and vehicle type with zero hidden surge spikes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. APP DOWNLOAD BAND */}
      <section className="bg-white py-16 border-b border-[#0e0f0c]/10">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="font-display text-4xl font-black text-[#0e0f0c]">
            It's easier in the apps
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate('/rider')}
              className="px-8 py-4 rounded-xl bg-[#9fe870] hover:bg-[#cdffad] text-[#0e0f0c] font-extrabold text-base shadow-sm flex items-center gap-2.5 transition-all cursor-pointer"
            >
              <Smartphone className="h-5 w-5" />
              <span>Download Rider App</span>
            </button>

            <button
              onClick={() => navigate('/driver')}
              className="px-8 py-4 rounded-xl bg-[#e8ebe6] hover:bg-[#d8dcd5] text-[#0e0f0c] font-bold text-base border border-[#0e0f0c]/10 flex items-center gap-2.5 transition-all cursor-pointer"
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
