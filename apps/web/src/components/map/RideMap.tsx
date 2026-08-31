import React, { useEffect, useMemo, useState } from 'react';
import { GoogleMap, Marker, DirectionsRenderer, useJsApiLoader } from '@react-google-maps/api';
import { LocationPoint } from '../../types';

interface RideMapProps {
  pickup?: LocationPoint | null;
  destination?: LocationPoint | null;
  driverLocation?: LocationPoint | null;
  height?: string;
  interactive?: boolean;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

const DEFAULT_CENTER = { lat: 17.4483, lng: 78.3915 };

const mapContainerStyle = { width: '100%', height: '100%' };

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  clickableIcons: false,
  styles: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  ],
};

const pickupIcon = (): google.maps.Symbol => ({
  path: google.maps.SymbolPath.CIRCLE,
  scale: 9,
  fillColor: '#000000',
  fillOpacity: 1,
  strokeColor: '#ffffff',
  strokeWeight: 2,
});

const destinationIcon = (): google.maps.Symbol => ({
  path: google.maps.SymbolPath.CIRCLE,
  scale: 9,
  fillColor: '#282828',
  fillOpacity: 1,
  strokeColor: '#ffffff',
  strokeWeight: 2,
});

const driverIcon = (): google.maps.Symbol => ({
  path: 'M17.402,0H5.643C4.361,0,3.322,1.034,3.322,2.31v19.38c0,1.276,1.04,2.31,2.322,2.31h11.759 c1.281,0,2.322-1.034,2.322-2.31V2.31C19.724,1.034,18.684,0,17.402,0z',
  scale: 1,
  fillColor: '#000000',
  fillOpacity: 1,
  strokeColor: '#ffffff',
  strokeWeight: 1,
  rotation: 0,
  anchor: new google.maps.Point(12, 12),
});

export const RideMap: React.FC<RideMapProps> = ({
  pickup,
  destination,
  driverLocation,
  height = '100%',
  interactive = true,
}) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'rydtrip-google-maps',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  const pickupPos = useMemo(
    () => (pickup ? { lat: pickup.latitude, lng: pickup.longitude } : null),
    [pickup]
  );
  const destinationPos = useMemo(
    () => (destination ? { lat: destination.latitude, lng: destination.longitude } : null),
    [destination]
  );
  const driverPos = useMemo(
    () => (driverLocation ? { lat: driverLocation.latitude, lng: driverLocation.longitude } : null),
    [driverLocation]
  );

  // Fetch the real driving route whenever both endpoints are known.
  useEffect(() => {
    if (!isLoaded || !pickupPos || !destinationPos) {
      setDirections(null);
      return;
    }

    const directionsService = new google.maps.DirectionsService();
    let cancelled = false;

    directionsService.route(
      {
        origin: pickupPos,
        destination: destinationPos,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (cancelled) return;
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
        } else {
          setDirections(null);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [isLoaded, pickupPos, destinationPos]);

  // Fit/center the map around whatever points are currently active.
  useEffect(() => {
    if (!map) return;

    const points = [pickupPos, destinationPos, driverPos].filter(
      (p): p is google.maps.LatLngLiteral => !!p
    );

    if (points.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 50);
    } else if (points.length === 1) {
      map.panTo(points[0]);
      map.setZoom(14);
    }
  }, [map, pickupPos, destinationPos, driverPos]);

  const center = pickupPos || driverPos || DEFAULT_CENTER;

  if (loadError) {
    return (
      <div
        className="relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-canvas-soft text-body-sm text-body shadow-subtle"
        style={{ height }}
      >
        Unable to load Google Maps.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-canvas-soft text-body-sm text-body shadow-subtle"
        style={{ height }}
      >
        Loading map…
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-canvas-soft shadow-subtle" style={{ height }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={13}
        options={{
          ...mapOptions,
          zoomControl: interactive,
          scrollwheel: interactive,
          gestureHandling: interactive ? 'auto' : 'none',
          draggable: interactive,
        }}
        onLoad={setMap}
        onUnmount={() => setMap(null)}
      >
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#000000',
                strokeWeight: 4,
                strokeOpacity: 0.8,
              },
            }}
          />
        )}

        {pickupPos && <Marker position={pickupPos} icon={pickupIcon()} title={pickup?.address} />}

        {destinationPos && (
          <Marker position={destinationPos} icon={destinationIcon()} title={destination?.address} />
        )}

        {driverPos && <Marker position={driverPos} icon={driverIcon()} title="Driver location" />}
      </GoogleMap>

      {/* Map Control Bar Overlay */}
      <div className="absolute top-4 right-4 z-[1000] flex gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-canvas px-3 py-1.5 text-caption font-medium shadow-pill-float border border-canvas-soft">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Live Dispatch GPS
        </span>
      </div>
    </div>
  );
};
