export interface ProxyRoute {
  prefix: string;
  target: string;
}

/**
 * Only services that exist get a route. /drivers/*\/location (Location
 * Service) is added once Phase 6 lands; see docs/architecture/api-contracts.md
 * for the target contract. /rides -> Rider Service as of Phase 5, which now
 * owns ride creation/cancellation (publishing Kafka events) instead of
 * Trip Service's retired Phase 2/3 bridge endpoint.
 */
export function getProxyRoutes(): ProxyRoute[] {
  return [
    { prefix: '/riders', target: process.env.RIDER_SERVICE_URL ?? 'http://localhost:3001' },
    { prefix: '/rides', target: process.env.RIDER_SERVICE_URL ?? 'http://localhost:3001' },
    { prefix: '/drivers', target: process.env.DRIVER_SERVICE_URL ?? 'http://localhost:3002' },
    { prefix: '/trips', target: process.env.TRIP_SERVICE_URL ?? 'http://localhost:3003' },
  ];
}

export function matchRoute(path: string, routes: ProxyRoute[]): ProxyRoute | undefined {
  return routes.find((route) => path === route.prefix || path.startsWith(`${route.prefix}/`));
}
