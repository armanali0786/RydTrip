import { getProxyRoutes, matchRoute, ProxyRoute } from './routes';

describe('matchRoute', () => {
  const routes: ProxyRoute[] = [
    { prefix: '/riders', target: 'http://rider' },
    { prefix: '/drivers', target: 'http://driver' },
    { prefix: '/trips', target: 'http://trip' },
  ];

  it('matches the bare prefix', () => {
    expect(matchRoute('/riders', routes)?.target).toBe('http://rider');
  });

  it('matches a nested path under the prefix', () => {
    expect(matchRoute('/drivers/abc-123/status', routes)?.target).toBe('http://driver');
  });

  it('does not match a prefix that only shares a leading substring', () => {
    // /ridersx should not match /riders
    expect(matchRoute('/ridersx', routes)).toBeUndefined();
  });

  it('returns undefined for an unconfigured path', () => {
    expect(matchRoute('/health/live', routes)).toBeUndefined();
    expect(matchRoute('/unknown', routes)).toBeUndefined();
  });
});

describe('getProxyRoutes (Phase 6 location routing)', () => {
  it('routes /drivers/:id/location to Location Service, not Driver Service', () => {
    process.env.LOCATION_SERVICE_URL = 'http://location';
    process.env.DRIVER_SERVICE_URL = 'http://driver';
    const routes = getProxyRoutes();

    expect(matchRoute('/drivers/abc-123/location', routes)?.target).toBe('http://location');
  });

  it('still routes other /drivers/* paths to Driver Service', () => {
    process.env.DRIVER_SERVICE_URL = 'http://driver';
    const routes = getProxyRoutes();

    expect(matchRoute('/drivers/abc-123', routes)?.target).toBe('http://driver');
    expect(matchRoute('/drivers/abc-123/status', routes)?.target).toBe('http://driver');
  });
});
