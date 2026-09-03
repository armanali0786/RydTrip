import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { LocationPoint } from '../../types';

interface RideMapProps {
  pickup?: LocationPoint | null;
  destination?: LocationPoint | null;
  driverLocation?: LocationPoint | null;
  height?: string;
  interactive?: boolean;
}

const DEFAULT_CENTER: L.LatLngTuple = [17.4483, 78.3915];

function dotIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

const pickupIcon = dotIcon('#000000');
const destinationIcon = dotIcon('#282828');

const driverIcon = L.divIcon({
  className: '',
  html: `<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:#000;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M17.402,0H5.643C4.361,0,3.322,1.034,3.322,2.31v19.38c0,1.276,1.04,2.31,2.322,2.31h11.759 c1.281,0,2.322-1.034,2.322-2.31V2.31C19.724,1.034,18.684,0,17.402,0z"/></svg>
  </div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

/** OSM tiles + the public OSRM demo router — free, no API key, matching this project's ₹0 cost philosophy. */
export const RideMap: React.FC<RideMapProps> = ({
  pickup,
  destination,
  driverLocation,
  height = '100%',
  interactive = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ pickup?: L.Marker; destination?: L.Marker; driver?: L.Marker }>({});
  const routingRef = useRef<L.Routing.Control | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 13,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
      touchZoom: interactive,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapRef.current = map;

    // Leaflet snapshots the container's pixel size once at creation and never re-checks it;
    // if the surrounding layout resizes afterwards (sidebar content changing height/width,
    // fonts settling, etc.) it keeps rendering tiles for the stale size, leaving the rest of
    // the now-larger container blank. Watch for real size changes and tell it to recalculate.
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      // The markers/routing control below were destroyed along with the map;
      // clear the refs so a remount creates fresh ones instead of touching stale objects.
      markersRef.current = {};
      routingRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep pickup/destination/driver markers in sync with props.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const upsert = (
      key: 'pickup' | 'destination' | 'driver',
      point: LocationPoint | null | undefined,
      icon: L.DivIcon,
      title?: string
    ) => {
      const existing = markersRef.current[key];
      if (!point) {
        existing?.remove();
        markersRef.current[key] = undefined;
        return;
      }

      const latlng: L.LatLngExpression = [point.latitude, point.longitude];
      if (existing) {
        existing.setLatLng(latlng);
      } else {
        markersRef.current[key] = L.marker(latlng, {
          icon,
          title,
          zIndexOffset: key === 'driver' ? 1000 : 0,
        }).addTo(map);
      }
    };

    upsert('pickup', pickup, pickupIcon, pickup?.address);
    upsert('destination', destination, destinationIcon, destination?.address);
    upsert('driver', driverLocation, driverIcon, 'Driver location');
  }, [pickup, destination, driverLocation]);

  // Fetch the real driving route whenever both endpoints are known. Updates the existing
  // control's waypoints in place rather than tearing it down each time, so an in-flight
  // OSRM request never outlives the control that started it.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!pickup || !destination) {
      if (routingRef.current) {
        map.removeControl(routingRef.current);
        routingRef.current = null;
      }
      return;
    }

    const from = L.latLng(pickup.latitude, pickup.longitude);
    const to = L.latLng(destination.latitude, destination.longitude);

    if (routingRef.current) {
      routingRef.current.setWaypoints([from, to]);
      return;
    }

    const plan = L.Routing.plan([from, to], {
      addWaypoints: false,
      draggableWaypoints: false,
      createMarker: () => false,
    });

    const control = L.Routing.control({
      plan,
      router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }),
      show: false,
      fitSelectedRoutes: false,
      lineOptions: {
        styles: [{ color: '#000000', weight: 4, opacity: 0.8 }],
        extendToWaypoints: true,
        missingRouteTolerance: 0,
      },
    }).addTo(map);

    // leaflet-routing-machine always injects an itinerary panel; we render our own markers/UI instead.
    control.getContainer()?.style.setProperty('display', 'none');

    routingRef.current = control;
  }, [pickup?.latitude, pickup?.longitude, destination?.latitude, destination?.longitude]);

  // Fit/center the map around whatever points are currently active.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const points: L.LatLngExpression[] = [pickup, destination, driverLocation]
      .filter((p): p is LocationPoint => !!p)
      .map((p) => [p.latitude, p.longitude]);

    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [50, 50] });
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    }
  }, [pickup, destination, driverLocation]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-canvas-soft shadow-subtle" style={{ height }}>
      <div ref={containerRef} className="h-full w-full" />

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
