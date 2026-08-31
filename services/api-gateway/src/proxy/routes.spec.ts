import { matchRoute, ProxyRoute } from './routes';

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
