import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { LocationPoint } from '../../types';

interface RideMapProps {
  pickup?: LocationPoint | null;
  destination?: LocationPoint | null;
  driverLocation?: LocationPoint | null;
  height?: string;
  interactive?: boolean;
}

// Custom Leaflet Icons styled with Uber design language
const createCustomIcon = (bgColor: string, iconSymbol: string, isDriver = false) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${bgColor};
        color: #ffffff;
        width: ${isDriver ? '40px' : '32px'};
        height: ${isDriver ? '40px' : '32px'};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 2px solid #ffffff;
        font-weight: bold;
        font-size: ${isDriver ? '18px' : '14px'};
        transition: transform 0.3s ease;
      ">
        ${iconSymbol}
      </div>
    `,
    iconSize: [isDriver ? 40 : 32, isDriver ? 40 : 32],
    iconAnchor: [isDriver ? 20 : 16, isDriver ? 20 : 16],
  });
};

const pickupIcon = createCustomIcon('#000000', '📍');
const destinationIcon = createCustomIcon('#282828', '🏁');
const driverIcon = createCustomIcon('#000000', '🚗', true);

// Component to dynamically fit map bounds around active points
function MapController({
  pickup,
  destination,
  driverLocation,
}: {
  pickup?: LocationPoint | null;
  destination?: LocationPoint | null;
  driverLocation?: LocationPoint | null;
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [];
    if (pickup) points.push([pickup.latitude, pickup.longitude]);
    if (destination) points.push([destination.latitude, destination.longitude]);
    if (driverLocation) points.push([driverLocation.latitude, driverLocation.longitude]);

    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    }
  }, [map, pickup, destination, driverLocation]);

  return null;
}

export const RideMap: React.FC<RideMapProps> = ({
  pickup,
  destination,
  driverLocation,
  height = '100%',
  interactive = true,
}) => {
  const centerLat = pickup?.latitude || driverLocation?.latitude || 17.4483;
  const centerLng = pickup?.longitude || driverLocation?.longitude || 78.3915;

  const polylinePositions: [number, number][] = [];
  if (pickup) polylinePositions.push([pickup.latitude, pickup.longitude]);
  if (destination) polylinePositions.push([destination.latitude, destination.longitude]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-canvas-soft shadow-subtle" style={{ height }}>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={13}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <MapController pickup={pickup} destination={destination} driverLocation={driverLocation} />

        {pickup && (
          <Marker position={[pickup.latitude, pickup.longitude]} icon={pickupIcon}>
            <Popup>
              <div className="text-xs font-semibold">📍 Pickup: {pickup.address}</div>
            </Popup>
          </Marker>
        )}

        {destination && (
          <Marker position={[destination.latitude, destination.longitude]} icon={destinationIcon}>
            <Popup>
              <div className="text-xs font-semibold">🏁 Destination: {destination.address}</div>
            </Popup>
          </Marker>
        )}

        {driverLocation && (
          <Marker position={[driverLocation.latitude, driverLocation.longitude]} icon={driverIcon}>
            <Popup>
              <div className="text-xs font-semibold">🚗 Driver Location</div>
            </Popup>
          </Marker>
        )}

        {polylinePositions.length === 2 && (
          <Polyline
            positions={polylinePositions}
            pathOptions={{
              color: '#000000',
              weight: 4,
              dashArray: '8, 8',
              opacity: 0.8,
            }}
          />
        )}
      </MapContainer>

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
