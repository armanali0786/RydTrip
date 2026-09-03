export interface ProxyRoute {
  prefix: string;
  target: string;
  /** Checked before prefix matching — for routes prefix matching can't express
   * (a variable segment sandwiched between two fixed ones). */
  pattern?: RegExp;
}

const DRIVER_LOCATION_PATTERN = /^\/drivers\/[^/]+\/location$/;

/**
 * Only services that exist get a route. /rides -> Rider Service as of
 * Phase 5, which now owns ride creation/cancellation (publishing Kafka
 * events) instead of Trip Service's retired Phase 2/3 bridge endpoint.
 * /drivers/*\/location -> Location Service as of Phase 6 (matched by pattern,
 * since it sits inside the otherwise Driver-Service-owned /drivers prefix).
 * /drivers/nearby -> Location Service, for the rider-facing real-vehicle
 * fare estimate — must be listed before the general /drivers prefix below.
 * /drivers/any-online -> Location Service, same reasoning, for seeding a
 * rider's initial pickup point from a real online driver instead of a
 * hardcoded default when geolocation isn't available.
 */
export function getProxyRoutes(): ProxyRoute[] {
  return [
    {
      prefix: '/drivers/*/location',
      target: process.env.LOCATION_SERVICE_URL ?? 'http://localhost:3004',
      pattern: DRIVER_LOCATION_PATTERN,
    },
    { prefix: '/drivers/nearby', target: process.env.LOCATION_SERVICE_URL ?? 'http://localhost:3004' },
    { prefix: '/drivers/any-online', target: process.env.LOCATION_SERVICE_URL ?? 'http://localhost:3004' },
    { prefix: '/riders', target: process.env.RIDER_SERVICE_URL ?? 'http://localhost:3001' },
    { prefix: '/rides', target: process.env.RIDER_SERVICE_URL ?? 'http://localhost:3001' },
    { prefix: '/drivers', target: process.env.DRIVER_SERVICE_URL ?? 'http://localhost:3002' },
    { prefix: '/trips', target: process.env.TRIP_SERVICE_URL ?? 'http://localhost:3003' },
  ];
}

export function matchRoute(path: string, routes: ProxyRoute[]): ProxyRoute | undefined {
  const patternMatch = routes.find((route) => route.pattern?.test(path));
  if (patternMatch) {
    return patternMatch;
  }
  return routes.find((route) => path === route.prefix || path.startsWith(`${route.prefix}/`));
}
