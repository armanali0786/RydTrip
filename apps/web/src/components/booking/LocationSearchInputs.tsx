import React, { useState } from 'react';
import { MapPin, Navigation, ArrowRightLeft } from 'lucide-react';
import { useBookingStore } from '../../stores/useBookingStore';
import { LocationPoint } from '../../types';

const POPULAR_LOCATIONS: LocationPoint[] = [
  { latitude: 17.4483, longitude: 78.3915, address: 'Hitec City Metro Station, Hyderabad', name: 'Cyber Towers / Hitec City' },
  { latitude: 17.4399, longitude: 78.4983, address: 'Secunderabad Railway Station, Hyderabad', name: 'Secunderabad Station' },
  { latitude: 17.2403, longitude: 78.4294, address: 'Rajiv Gandhi International Airport (HYD)', name: 'Airport (HYD)' },
  { latitude: 17.43, longitude: 78.44, address: 'Jubilee Hills Road No. 36, Hyderabad', name: 'Jubilee Hills' },
];

/**
 * Pickup/dropoff search inputs, shared between the marketing landing page's
 * hero form and RiderPage's booking panel — no login required to use this
 * anywhere, it only reads/writes the global useBookingStore. Filtering
 * POPULAR_LOCATIONS by the typed text is a placeholder for a real geocoding
 * autocomplete (out of scope here — no maps/places API is wired up yet).
 */
export const LocationSearchInputs: React.FC = () => {
  const { pickup, setPickup, destination, setDestination, swapPickupDestination } = useBookingStore();

  const [pickupInput, setPickupInput] = useState(pickup?.address ?? '');
  const [destinationInput, setDestinationInput] = useState(destination?.address ?? '');
  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

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
    <div className="space-y-3">
      {/* Pickup Input Row */}
      <div className="relative">
        <div className="flex items-center rounded-lg bg-canvas-soft px-4 py-3.5 border border-transparent focus-within:border-ink focus-within:bg-white transition-all">
          <span className="mr-3 text-primary font-bold text-lg">📍</span>
          <input
            type="text"
            value={pickupInput}
            onChange={(e) => setPickupInput(e.target.value)}
            onFocus={() => setShowPickupDropdown(true)}
            onBlur={() => setTimeout(() => setShowPickupDropdown(false), 150)}
            placeholder="Enter pickup location"
            className="w-full bg-transparent text-sm font-semibold text-ink placeholder:text-body/60 focus:outline-none"
          />
        </div>

        {showPickupDropdown && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1.5 rounded-xl bg-white p-2 shadow-2xl border border-ink">
            <div className="text-[11px] font-bold text-body/70 px-3 py-1.5 uppercase tracking-wider">
              Popular Pickup Points
            </div>
            {POPULAR_LOCATIONS.map((loc) => (
              <button
                key={loc.name}
                type="button"
                onClick={() => handleSelectPickup(loc)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-canvas-soft text-sm font-medium text-ink transition-colors"
              >
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <div className="font-bold">{loc.name}</div>
                  <div className="text-xs text-body">{loc.address}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dropoff Input Row */}
      <div className="relative">
        <div className="flex items-center rounded-lg bg-canvas-soft px-4 py-3.5 border border-transparent focus-within:border-ink focus-within:bg-white transition-all">
          <span className="mr-3 text-ink text-lg">🏁</span>
          <input
            type="text"
            value={destinationInput}
            onChange={(e) => setDestinationInput(e.target.value)}
            onFocus={() => setShowDestDropdown(true)}
            onBlur={() => setTimeout(() => setShowDestDropdown(false), 150)}
            placeholder="Enter dropoff destination"
            className="w-full bg-transparent text-sm font-semibold text-ink placeholder:text-body/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              swapPickupDestination();
              setPickupInput(destinationInput);
              setDestinationInput(pickupInput);
            }}
            className="ml-2 p-1.5 text-body hover:text-ink hover:bg-white rounded-full transition-colors"
            title="Swap pickup & dropoff"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </button>
        </div>

        {showDestDropdown && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1.5 rounded-xl bg-white p-2 shadow-2xl border border-ink">
            <div className="text-[11px] font-bold text-body/70 px-3 py-1.5 uppercase tracking-wider">
              Popular Destinations
            </div>
            {POPULAR_LOCATIONS.map((loc) => (
              <button
                key={loc.name}
                type="button"
                onClick={() => handleSelectDest(loc)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-canvas-soft text-sm font-medium text-ink transition-colors"
              >
                <Navigation className="h-4 w-4 text-ink shrink-0" />
                <div>
                  <div className="font-bold">{loc.name}</div>
                  <div className="text-xs text-body">{loc.address}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
