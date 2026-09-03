import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';

interface RateLimitPolicy {
  method: string;
  pattern: RegExp;
  limit: number;
  windowMs: number;
  label: string;
}

// Tightest tier: every route reachable with no token at all (registration,
// login, and the guest-estimate reads jwt-auth.guard.ts's PUBLIC_ROUTES/
// PUBLIC_PATTERNS already carve out) — the natural targets for credential
// stuffing, account-enumeration, and anonymous scraping/DDoS, since there's
// no verified identity yet to distinguish an attacker from a real user.
const RATE_LIMIT_POLICIES: readonly RateLimitPolicy[] = [
  { method: 'POST', pattern: /^\/riders$/, limit: 10, windowMs: 60_000, label: 'auth' },
  { method: 'POST', pattern: /^\/riders\/login$/, limit: 10, windowMs: 60_000, label: 'auth' },
  { method: 'POST', pattern: /^\/drivers$/, limit: 10, windowMs: 60_000, label: 'auth' },
  { method: 'POST', pattern: /^\/drivers\/login$/, limit: 10, windowMs: 60_000, label: 'auth' },
  { method: 'GET', pattern: /^\/drivers\/nearby$/, limit: 20, windowMs: 60_000, label: 'public-read' },
  { method: 'GET', pattern: /^\/drivers\/any-online$/, limit: 20, windowMs: 60_000, label: 'public-read' },
  { method: 'GET', pattern: /^\/drivers\/[^/]+\/vehicle$/, limit: 20, windowMs: 60_000, label: 'public-read' },
];

// Everything else: authenticated traffic from a role already vetted by
// JwtAuthGuard downstream of this guard — looser, since it's not the
// pre-auth surface an anonymous attacker would hit first.
const DEFAULT_POLICY: RateLimitPolicy = {
  method: '*',
  pattern: /.*/,
  limit: 100,
  windowMs: 60_000,
  label: 'default',
};

function findRateLimitPolicy(method: string, path: string): RateLimitPolicy {
  for (const policy of RATE_LIMIT_POLICIES) {
    if (policy.method === method && policy.pattern.test(path)) {
      return policy;
    }
  }
  return DEFAULT_POLICY;
}

// Fixed-window counter, in-memory. Correct for the gateway's current
// single-instance reality (no HPA on api-gateway, per Phase 9's scope) —
// a distributed store (Redis, already in the stack) only becomes necessary
// if the gateway is ever scaled to multiple replicas, since counters here
// don't survive a process restart and aren't shared across instances.
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor() {
    // Sweeps stale entries so long-lived process memory doesn't grow
    // unbounded with one-off callers that never come back within their
    // window. unref() so this timer never keeps the process (or a Jest
    // worker) alive on its own.
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.hits) {
        if (value.resetAt <= now) {
          this.hits.delete(key);
        }
      }
    }, 5 * 60_000).unref();
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    // Same exemption as JwtAuthGuard: liveness/readiness probes (Docker
    // healthchecks, Kubernetes kubelet) call this on a fixed, frequent
    // schedule from a trusted caller, not a request an attacker controls.
    if (req.path.startsWith('/health')) {
      return true;
    }

    const policy = findRateLimitPolicy(req.method, req.path);
    const ip = req.ip ?? 'unknown';
    const key = `${policy.label}:${ip}`;
    const now = Date.now();

    const existing = this.hits.get(key);
    if (!existing || existing.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + policy.windowMs });
      return true;
    }

    if (existing.count >= policy.limit) {
      const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfterSeconds));
      throw new HttpException(
        { statusCode: HttpStatus.TOO_MANY_REQUESTS, message: 'Too many requests, please try again later' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    existing.count += 1;
    return true;
  }
}
