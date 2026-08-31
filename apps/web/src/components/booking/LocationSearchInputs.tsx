import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, ArrowRightLeft, LocateFixed, Loader2 } from 'lucide-react';
import { useBookingStore, DEFAULT_PICKUP } from '../../stores/useBookingStore';
import { LocationPoint } from '../../types';
import { searchPlaces, reverseGeocode, getCurrentPosition } from '../../api/geocoding';

const POPULAR_LOCATIONS: LocationPoint[] = [
  { latitude: 17.4483, longitude: 78.3915, address: 'Hitec City Metro Station, Hyderabad', name: 'Cyber Towers / Hitec City' },
  { latitude: 17.4399, longitude: 78.4983, address: 'Secunderabad Railway Station, Hyderabad', name: 'Secunderabad Station' },
  { latitude: 17.2403, longitude: 78.4294, address: 'Rajiv Gandhi International Airport (HYD)', name: 'Airport (HYD)' },
  { latitude: 17.43, longitude: 78.44, address: 'Jubilee Hills Road No. 36, Hyderabad', name: 'Jubilee Hills' },
];

const SEARCH_DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 3;

/** Debounced, cancellable live search against Nominatim — shared shape for both the pickup and dropoff fields. */
function usePlaceSearch(query: string, active: boolean) {
  const [results, setResults] = useState<LocationPoint[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!active) return;
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);
    const timer = setTimeout(() => {
      searchPlaces(trimmed, controller.signal)
        .then(setResults)
        .catch((err) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          setResults([]);
        })
        .finally(() => setIsSearching(false));
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, active]);

  return { results, isSearching };
}

/**
 * Pickup/dropoff search inputs, shared between the marketing landing page's
 * hero form and RiderPage's booking panel — no login required to use this
 * anywhere, it only reads/writes the global useBookingStore. Real
 * search-as-you-type (Nominatim/OpenStreetMap, free, no API key) once 3+
 * characters are typed; the static "popular" list is just the empty-input
 * default, the same role Uber's "Saved places" list plays before you type.
 */
export const LocationSearchInputs: React.FC = () => {
  const { pickup, setPickup, destination, setDestination, swapPickupDestination } = useBookingStore();

  const [pickupInput, setPickupInput] = useState(pickup?.address ?? '');
  const [destinationInput, setDestinationInput] = useState(destination?.address ?? '');
  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  const pickupSearch = usePlaceSearch(pickupInput, showPickupDropdown);
  const destSearch = usePlaceSearch(destinationInput, showDestDropdown);

  const detectCurrentLocation = async () => {
    setIsDetecting(true);
    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;
      const address = (await reverseGeocode(latitude, longitude)) ?? `Current location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
      const loc: LocationPoint = { latitude, longitude, address, name: 'Current location' };
      setPickup(loc);
      setPickupInput(loc.address);
      setShowPickupDropdown(false);
    } catch {
      // Permission denied, unsupported, or a network failure — silently keep
      // whatever pickup is already set. The button stays available to retry.
    } finally {
      setIsDetecting(false);
    }
  };

  // Auto-detect once on first mount, but only if the rider hasn't already
  // picked a real pickup point — never clobber an explicit choice.
  const hasAutoDetected = useRef(false);
  useEffect(() => {
    if (hasAutoDetected.current) return;
    hasAutoDetected.current = true;
    if (pickup?.address === DEFAULT_PICKUP.address) {
      void detectCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const pickupQueryTooShort = pickupInput.trim().length < MIN_QUERY_LENGTH;
  const destQueryTooShort = destinationInput.trim().length < MIN_QUERY_LENGTH;

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
          {isDetecting && <Loader2 className="h-4 w-4 text-body animate-spin shrink-0" />}
        </div>

        {showPickupDropdown && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-80 overflow-y-auto rounded-xl bg-white p-2 shadow-2xl border border-ink">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={detectCurrentLocation}
              disabled={isDetecting}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-canvas-soft text-sm font-bold text-ink transition-colors disabled:opacity-50"
            >
              {isDetecting ? (
                <Loader2 className="h-4 w-4 text-primary shrink-0 animate-spin" />
              ) : (
                <LocateFixed className="h-4 w-4 text-primary shrink-0" />
              )}
              <span>{isDetecting ? 'Detecting your location…' : 'Use my current location'}</span>
            </button>

            {pickupQueryTooShort ? (
              <>
                <div className="text-[11px] font-bold text-body/70 px-3 py-1.5 pt-2 uppercase tracking-wider">
                  Popular Pickup Points
                </div>
                {POPULAR_LOCATIONS.map((loc) => (
                  <button
                    key={loc.name}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
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
              </>
            ) : (
              <PlaceResults results={pickupSearch.results} isSearching={pickupSearch.isSearching} onSelect={handleSelectPickup} />
            )}
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
          <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-80 overflow-y-auto rounded-xl bg-white p-2 shadow-2xl border border-ink">
            {destQueryTooShort ? (
              <>
                <div className="text-[11px] font-bold text-body/70 px-3 py-1.5 uppercase tracking-wider">
                  Popular Destinations
                </div>
                {POPULAR_LOCATIONS.map((loc) => (
                  <button
                    key={loc.name}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
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
              </>
            ) : (
              <PlaceResults results={destSearch.results} isSearching={destSearch.isSearching} onSelect={handleSelectDest} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const PlaceResults: React.FC<{
  results: LocationPoint[];
  isSearching: boolean;
  onSelect: (loc: LocationPoint) => void;
}> = ({ results, isSearching, onSelect }) => {
  if (isSearching && results.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-3 text-sm font-medium text-body">
        <Loader2 className="h-4 w-4 animate-spin" />
        Searching…
      </div>
    );
  }

  if (results.length === 0) {
    return <div className="px-3 py-3 text-sm font-medium text-body">No matches found</div>;
  }

  return (
    <>
      {results.map((loc, i) => (
        <button
          key={`${loc.latitude}-${loc.longitude}-${i}`}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(loc)}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-canvas-soft text-sm font-medium text-ink transition-colors"
        >
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="font-bold truncate">{loc.name}</div>
            <div className="text-xs text-body truncate">{loc.address}</div>
          </div>
        </button>
      ))}
    </>
  );
};
