import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';

function makeContext(method: string, path: string, ip = '10.0.0.1') {
  const req = { method, path, ip };
  const headers: Record<string, string> = {};
  const res = {
    set: jest.fn((name: string, value: string) => {
      headers[name] = value;
    }),
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ExecutionContext;

  return { context, res, headers };
}

describe('RateLimitGuard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('allows requests under the default tier limit', () => {
    const guard = new RateLimitGuard();
    const { context } = makeContext('GET', '/trips/some-id');

    for (let i = 0; i < 100; i++) {
      expect(guard.canActivate(context)).toBe(true);
    }
  });

  it('blocks the request past the default tier limit with 429 and a Retry-After header', () => {
    const guard = new RateLimitGuard();
    const { context, headers } = makeContext('GET', '/trips/some-id');

    for (let i = 0; i < 100; i++) {
      guard.canActivate(context);
    }

    expect(() => guard.canActivate(context)).toThrow(HttpException);
    try {
      guard.canActivate(context);
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
    expect(headers['Retry-After']).toBeDefined();
  });

  it('applies the tighter auth tier to POST /riders/login independently of the default tier', () => {
    const guard = new RateLimitGuard();
    const { context: loginCtx } = makeContext('POST', '/riders/login');

    for (let i = 0; i < 10; i++) {
      expect(guard.canActivate(loginCtx)).toBe(true);
    }
    expect(() => guard.canActivate(loginCtx)).toThrow(HttpException);

    // Exhausting the auth tier's bucket must not affect the same IP's
    // default-tier bucket for an unrelated route.
    const { context: otherCtx } = makeContext('GET', '/trips/some-id', '10.0.0.1');
    expect(guard.canActivate(otherCtx)).toBe(true);
  });

  it('tracks different IPs independently', () => {
    const guard = new RateLimitGuard();
    const { context: ctxA } = makeContext('POST', '/riders/login', '10.0.0.1');
    const { context: ctxB } = makeContext('POST', '/riders/login', '10.0.0.2');

    for (let i = 0; i < 10; i++) {
      guard.canActivate(ctxA);
    }
    expect(() => guard.canActivate(ctxA)).toThrow(HttpException);
    expect(guard.canActivate(ctxB)).toBe(true);
  });

  it('resets the counter once the window elapses', () => {
    const guard = new RateLimitGuard();
    const { context } = makeContext('POST', '/riders/login');

    for (let i = 0; i < 10; i++) {
      guard.canActivate(context);
    }
    expect(() => guard.canActivate(context)).toThrow(HttpException);

    jest.setSystemTime(60_001);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('never throttles health check paths', () => {
    const guard = new RateLimitGuard();
    const { context } = makeContext('GET', '/health/live');

    for (let i = 0; i < 500; i++) {
      expect(guard.canActivate(context)).toBe(true);
    }
  });
});
