import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Calendar, Clock, ArrowRightLeft, Car, Key, ShieldCheck, ArrowRight } from 'lucide-react';
import { useBookingStore } from '../../stores/useBookingStore';
import { LocationPoint } from '../../types';

const POPULAR_LOCATIONS: LocationPoint[] = [
  { latitude: 17.4483, longitude: 78.3915, address: 'Hitec City Metro Station, Hyderabad', name: 'Cyber Towers / Hitec City' },
  { latitude: 17.4399, longitude: 78.4983, address: 'Secunderabad Railway Station, Hyderabad', name: 'Secunderabad Station' },
  { latitude: 17.2403, longitude: 78.4294, address: 'Rajiv Gandhi International Airport (HYD)', name: 'Airport (HYD)' },
  { latitude: 17.43, longitude: 78.44, address: 'Jubilee Hills Road No. 36, Hyderabad', name: 'Jubilee Hills' },
];

export const HeroRideForm: React.FC<{ onSearchSubmit?: () => void }> = ({ onSearchSubmit }) => {
  const navigate = useNavigate();
  const {
    activeTab,
    setActiveTab,
    pickup,
    setPickup,
    destination,
    setDestination,
    swapPickupDestination,
  } = useBookingStore();

  const [pickupInput, setPickupInput] = useState(pickup?.address || 'Hitec City Metro Station, Hyderabad');
  const [destinationInput, setDestinationInput] = useState(destination?.address || 'Secunderabad Railway Station, Hyderabad');
  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [scheduledForLater, setScheduledForLater] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupInput || !destinationInput) return;

    if (onSearchSubmit) {
      onSearchSubmit();
    } else {
      navigate('/rider');
    }
  };

  const handleSelectPickup = (loc: LocationPoint) => {
    setPickup(loc);
    setPickupInput(loc.address);
    setShowPickupDropdown(false);
  };

  const handleSelectDest = (loc: LocationPoint) => {
    setDestination(loc);
    setDestinationInput(loc.address);
    setShowDestDropdown(false);
  };

  return (
    <div className="w-full max-w-[480px] rounded-xl bg-white p-6 md:p-8 shadow-card border border-[#0e0f0c] text-[#0e0f0c]">
      {/* Mode Tabs */}
      <div className="mb-6 flex items-center justify-between gap-1.5 rounded-xl bg-[#e8ebe6] p-1.5 border border-[#0e0f0c]/10">
        <button
          type="button"
          onClick={() => setActiveTab('ride')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'ride'
              ? 'bg-[#0e0f0c] text-white shadow-sm'
              : 'text-[#454745] hover:text-[#0e0f0c] hover:bg-white/50'
          }`}
        >
          <Car className="h-4 w-4" />
          <span>Ride</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('drive')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'drive'
              ? 'bg-[#0e0f0c] text-white shadow-sm'
              : 'text-[#454745] hover:text-[#0e0f0c] hover:bg-white/50'
          }`}
        >
          <Key className="h-4 w-4" />
          <span>Drive</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reserve')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'reserve'
              ? 'bg-[#0e0f0c] text-white shadow-sm'
              : 'text-[#454745] hover:text-[#0e0f0c] hover:bg-white/50'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Reserve</span>
        </button>
      </div>

      {/* Wise-Style Headline Display Weight 900 */}
      <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight text-[#0e0f0c] mb-6 leading-tight">
        Go anywhere with <span className="bg-[#e2f6d5] px-2 py-0.5 rounded-lg text-[#054d28]">RydTrip</span>
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Pickup Input Row */}
        <div className="relative">
          <div className="flex items-center rounded-lg bg-[#e8ebe6] px-4 py-3.5 border border-transparent focus-within:border-[#0e0f0c] focus-within:bg-white transition-all">
            <span className="mr-3 text-[#054d28] font-bold text-lg">📍</span>
            <input
              type="text"
              value={pickupInput}
              onChange={(e) => setPickupInput(e.target.value)}
              onFocus={() => setShowPickupDropdown(true)}
              placeholder="Enter pickup location"
              className="w-full bg-transparent text-sm font-semibold text-[#0e0f0c] placeholder:text-[#868685] focus:outline-none"
            />
            {pickupInput && (
              <button
                type="button"
                onClick={() => setPickupInput('')}
                className="text-[#868685] hover:text-[#0e0f0c] text-xs font-bold px-1.5 py-0.5 rounded"
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showPickupDropdown && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1.5 rounded-xl bg-white p-2 shadow-2xl border border-[#0e0f0c]">
              <div className="text-[11px] font-bold text-[#868685] px-3 py-1.5 uppercase tracking-wider">
                Popular Pickup Points
              </div>
              {POPULAR_LOCATIONS.map((loc) => (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => handleSelectPickup(loc)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-[#e8ebe6] text-sm font-medium text-[#0e0f0c] transition-colors"
                >
                  <MapPin className="h-4 w-4 text-[#054d28] shrink-0" />
                  <div>
                    <div className="font-bold">{loc.name}</div>
                    <div className="text-xs text-[#454745]">{loc.address}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dropoff Input Row */}
        <div className="relative">
          <div className="flex items-center rounded-lg bg-[#e8ebe6] px-4 py-3.5 border border-transparent focus-within:border-[#0e0f0c] focus-within:bg-white transition-all">
            <span className="mr-3 text-[#0e0f0c] text-lg">🏁</span>
            <input
              type="text"
              value={destinationInput}
              onChange={(e) => setDestinationInput(e.target.value)}
              onFocus={() => setShowDestDropdown(true)}
              placeholder="Enter dropoff destination"
              className="w-full bg-transparent text-sm font-semibold text-[#0e0f0c] placeholder:text-[#868685] focus:outline-none"
            />
            <button
              type="button"
              onClick={swapPickupDestination}
              className="ml-2 p-1.5 text-[#454745] hover:text-[#0e0f0c] hover:bg-white rounded-full transition-colors"
              title="Swap pickup & dropoff"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </button>
          </div>

          {showDestDropdown && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1.5 rounded-xl bg-white p-2 shadow-2xl border border-[#0e0f0c]">
              <div className="text-[11px] font-bold text-[#868685] px-3 py-1.5 uppercase tracking-wider">
                Popular Destinations
              </div>
              {POPULAR_LOCATIONS.map((loc) => (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => handleSelectDest(loc)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-[#e8ebe6] text-sm font-medium text-[#0e0f0c] transition-colors"
                >
                  <Navigation className="h-4 w-4 text-[#0e0f0c] shrink-0" />
                  <div>
                    <div className="font-bold">{loc.name}</div>
                    <div className="text-xs text-[#454745]">{loc.address}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Schedule & Timing Chips */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => setScheduledForLater(!scheduledForLater)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              scheduledForLater
                ? 'bg-[#0e0f0c] text-white shadow-sm'
                : 'bg-[#e8ebe6] text-[#0e0f0c] hover:bg-[#d8dcd5]'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>{scheduledForLater ? 'Today 5:30 PM' : 'Pickup now'}</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-[#e8ebe6] px-4 py-2 text-xs font-bold text-[#0e0f0c] hover:bg-[#d8dcd5] transition-colors"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>For me</span>
          </button>
        </div>

        {/* Wise Signature Lime-Green CTA Button (#9fe870) */}
        <div className="pt-3">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-[#9fe870] hover:bg-[#cdffad] active:bg-[#c5edab] text-[#0e0f0c] font-extrabold text-base shadow-sm transition-all duration-200 cursor-pointer"
          >
            <span>See prices & request ride</span>
            <ArrowRight className="h-5 w-5 stroke-[2.5]" />
          </button>
        </div>
      </form>
    </div>
  );
};
