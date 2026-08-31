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
    <div className="w-full max-w-[480px] rounded-2xl bg-white p-6 md:p-8 shadow-card border border-slate-100 text-slate-900">
      {/* Mode Tabs */}
      <div className="mb-6 flex items-center justify-between gap-1.5 rounded-2xl bg-slate-100 p-1.5 border border-slate-200/60">
        <button
          type="button"
          onClick={() => setActiveTab('ride')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'ride'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Car className="h-4 w-4" />
          <span>Ride</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('drive')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'drive'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Key className="h-4 w-4" />
          <span>Drive</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reserve')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'reserve'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Reserve</span>
        </button>
      </div>

      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-6 leading-snug">
        Go anywhere with <span className="text-emerald-600">RydTrip</span>
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Pickup Input Row */}
        <div className="relative">
          <div className="flex items-center rounded-xl bg-slate-100 px-4 py-3 border border-transparent focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
            <span className="mr-3 text-emerald-600 text-lg">📍</span>
            <input
              type="text"
              value={pickupInput}
              onChange={(e) => setPickupInput(e.target.value)}
              onFocus={() => setShowPickupDropdown(true)}
              placeholder="Enter pickup location"
              className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            {pickupInput && (
              <button
                type="button"
                onClick={() => setPickupInput('')}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold px-1.5 py-0.5 rounded"
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showPickupDropdown && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1.5 rounded-xl bg-white p-2 shadow-2xl border border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
                Popular Pickup Points
              </div>
              {POPULAR_LOCATIONS.map((loc) => (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => handleSelectPickup(loc)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-800 transition-colors"
                >
                  <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-semibold">{loc.name}</div>
                    <div className="text-xs text-slate-500">{loc.address}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dropoff Input Row */}
        <div className="relative">
          <div className="flex items-center rounded-xl bg-slate-100 px-4 py-3 border border-transparent focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
            <span className="mr-3 text-slate-700 text-lg">🏁</span>
            <input
              type="text"
              value={destinationInput}
              onChange={(e) => setDestinationInput(e.target.value)}
              onFocus={() => setShowDestDropdown(true)}
              placeholder="Enter dropoff destination"
              className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={swapPickupDestination}
              className="ml-2 p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-full transition-colors"
              title="Swap pickup & dropoff"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </button>
          </div>

          {showDestDropdown && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1.5 rounded-xl bg-white p-2 shadow-2xl border border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
                Popular Destinations
              </div>
              {POPULAR_LOCATIONS.map((loc) => (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => handleSelectDest(loc)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-800 transition-colors"
                >
                  <Navigation className="h-4 w-4 text-slate-700 shrink-0" />
                  <div>
                    <div className="font-semibold">{loc.name}</div>
                    <div className="text-xs text-slate-500">{loc.address}</div>
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
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>{scheduledForLater ? 'Today 5:30 PM' : 'Pickup now'}</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200/70 transition-colors"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>For me</span>
          </button>
        </div>

        {/* Primary CTA Button - High Visibility Electric Button */}
        <div className="pt-3">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white font-bold text-base shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 cursor-pointer active:scale-[0.98]"
          >
            <span>See prices & request ride</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
};
