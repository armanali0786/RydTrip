import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Calendar, Clock, ArrowRightLeft, Car, Key, ShieldCheck } from 'lucide-react';
import { useBookingStore, DEFAULT_PICKUP, DEFAULT_DESTINATION } from '../../stores/useBookingStore';
import { Button } from '../ui/Button';
import { LocationPoint } from '../../types';

const POPULAR_LOCATIONS: LocationPoint[] = [
  { latitude: 17.4483, longitude: 78.3915, address: 'Hitec City Cyber Towers, Hyderabad', name: 'Cyber Towers' },
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

  const [pickupInput, setPickupInput] = useState(pickup?.address || '');
  const [destinationInput, setDestinationInput] = useState(destination?.address || '');
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
    <div className="w-full max-w-[490px] rounded-xl bg-canvas p-6 shadow-card border border-canvas-soft">
      {/* Off-shape Tab-toggle translucent pill (36px rounded) */}
      <div className="mb-6 flex items-center justify-between gap-1 rounded-pill-tab bg-canvas-soft p-1">
        <button
          type="button"
          onClick={() => setActiveTab('ride')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-pill-tab text-body-md-strong transition-all ${
            activeTab === 'ride'
              ? 'bg-primary text-on-dark shadow-sm'
              : 'text-ink hover:bg-canvas/50'
          }`}
        >
          <Car className="h-4 w-4" />
          <span>Ride</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('drive')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-pill-tab text-body-md-strong transition-all ${
            activeTab === 'drive'
              ? 'bg-primary text-on-dark shadow-sm'
              : 'text-ink hover:bg-canvas/50'
          }`}
        >
          <Key className="h-4 w-4" />
          <span>Drive</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reserve')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-pill-tab text-body-md-strong transition-all ${
            activeTab === 'reserve'
              ? 'bg-primary text-on-dark shadow-sm'
              : 'text-ink hover:bg-canvas/50'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Reserve</span>
        </button>
      </div>

      <h1 className="font-display text-display-xl font-bold text-ink mb-6 leading-tight">
        Go anywhere with Uber
      </h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Pickup Input Row */}
        <div className="relative">
          <div className="flex items-center rounded-md bg-canvas-soft px-3.5 py-3 border border-transparent focus-within:border-ink transition-colors">
            <span className="mr-3 text-ink">📍</span>
            <input
              type="text"
              value={pickupInput}
              onChange={(e) => setPickupInput(e.target.value)}
              onFocus={() => setShowPickupDropdown(true)}
              placeholder="Pickup location"
              className="w-full bg-transparent text-body-md font-medium text-ink placeholder:text-mute focus:outline-none"
            />
            {pickupInput && (
              <button
                type="button"
                onClick={() => setPickupInput('')}
                className="text-caption text-mute hover:text-ink"
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showPickupDropdown && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl bg-canvas p-2 shadow-card border border-canvas-soft">
              <div className="text-caption font-semibold text-mute px-3 py-1 uppercase tracking-wider">
                Popular Pickups
              </div>
              {POPULAR_LOCATIONS.map((loc) => (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => handleSelectPickup(loc)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-md hover:bg-canvas-soft text-body-sm text-ink font-medium"
                >
                  <MapPin className="h-4 w-4 text-body shrink-0" />
                  <div>
                    <div>{loc.name}</div>
                    <div className="text-caption text-mute">{loc.address}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Destination Input Row */}
        <div className="relative">
          <div className="flex items-center rounded-md bg-canvas-soft px-3.5 py-3 border border-transparent focus-within:border-ink transition-colors">
            <span className="mr-3 text-ink">🏁</span>
            <input
              type="text"
              value={destinationInput}
              onChange={(e) => setDestinationInput(e.target.value)}
              onFocus={() => setShowDestDropdown(true)}
              placeholder="Dropoff location"
              className="w-full bg-transparent text-body-md font-medium text-ink placeholder:text-mute focus:outline-none"
            />
            <button
              type="button"
              onClick={swapPickupDestination}
              className="ml-2 p-1 text-body hover:text-ink rounded-full"
              title="Swap pickup and dropoff"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </button>
          </div>

          {showDestDropdown && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-xl bg-canvas p-2 shadow-card border border-canvas-soft">
              <div className="text-caption font-semibold text-mute px-3 py-1 uppercase tracking-wider">
                Popular Destinations
              </div>
              {POPULAR_LOCATIONS.map((loc) => (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => handleSelectDest(loc)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-md hover:bg-canvas-soft text-body-sm text-ink font-medium"
                >
                  <Navigation className="h-4 w-4 text-body shrink-0" />
                  <div>
                    <div>{loc.name}</div>
                    <div className="text-caption text-mute">{loc.address}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date / Time Chip Row */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setScheduledForLater(!scheduledForLater)}
            className={`flex items-center gap-2 rounded-pill px-4 py-2 text-body-sm font-medium transition-colors ${
              scheduledForLater
                ? 'bg-primary text-on-dark'
                : 'bg-canvas-soft text-ink hover:bg-surface-pressed'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>{scheduledForLater ? 'Pickup: Today 5:30 PM' : 'Pickup now'}</span>
          </button>
          
          <button
            type="button"
            className="flex items-center gap-2 rounded-pill bg-canvas-soft px-4 py-2 text-body-sm font-medium text-ink hover:bg-surface-pressed transition-colors"
          >
            <Clock className="h-4 w-4" />
            <span>For me</span>
          </button>
        </div>

        {/* Black Canonical Conversion Primary Pill */}
        <div className="pt-3">
          <Button variant="primary" size="lg" fullWidth type="submit">
            See prices & request
          </Button>
        </div>
      </form>
    </div>
  );
};
