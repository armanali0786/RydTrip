export interface ProxyRoute {
  prefix: string;
  target: string;
}

/**
 * Phase 2 routing table — only services that exist get a route. /rides
 * (Rider Service) and /drivers/*\/location (Location Service) are added once
 * those endpoints exist (Phase 5+ and Phase 6 respectively); see
 * docs/architecture/api-contracts.md for the target contract.
 */
export function getProxyRoutes(): ProxyRoute[] {
  return [
    { prefix: '/riders', target: process.env.RIDER_SERVICE_URL ?? 'http://localhost:3001' },
    { prefix: '/drivers', target: process.env.DRIVER_SERVICE_URL ?? 'http://localhost:3002' },
    { prefix: '/trips', target: process.env.TRIP_SERVICE_URL ?? 'http://localhost:3003' },
  ];
}

export function matchRoute(path: string, routes: ProxyRoute[]): ProxyRoute | undefined {
  return routes.find((route) => path === route.prefix || path.startsWith(`${route.prefix}/`));
}
