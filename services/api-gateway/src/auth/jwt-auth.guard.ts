import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { getProxyRoutes, matchRoute } from '../proxy/routes';

// 'operator' has no account-creation flow anywhere yet (no operator
// registration/login exists in any service) — it's included in every policy
// below so RBAC is already forward-compatible with Phase 13+'s eventual
// admin/ops tooling, without another pass through every route once that
// exists. Today, every real token minted by rider-service/driver-service's
// login endpoints only ever carries 'rider' or 'driver'.
export type Role = 'rider' | 'driver' | 'operator';

export interface AuthenticatedUser {
  sub: string;
  role: Role;
  phone: string;
}

export type RequestWithUser = Request & { user?: AuthenticatedUser };

// Account creation and login are the only ways to obtain a token, so they
// can't require one themselves. GET /drivers/nearby is public so a guest can
// see a real fare estimate before logging in (see RiderPage's guest-browsing
// design); it only returns driverId/coords/distance, no PII. GET
// /drivers/any-online is the same guest-facing shape, used to seed a pickup
// point from a real online driver when geolocation isn't available.
const PUBLIC_ROUTES: ReadonlyArray<{ method: string; path: string }> = [
  { method: 'POST', path: '/riders' },
  { method: 'POST', path: '/riders/login' },
  { method: 'POST', path: '/drivers' },
  { method: 'POST', path: '/drivers/login' },
  { method: 'GET', path: '/drivers/nearby' },
  { method: 'GET', path: '/drivers/any-online' },
];

// GET /drivers/:id/vehicle is the PII-free companion to /drivers/nearby above
// — same guest-estimate flow, needs the dynamic :id segment so it can't be a
// plain PUBLIC_ROUTES entry. GET /drivers/:id (full profile, with phone/email)
// stays behind auth.
const PUBLIC_PATTERNS: ReadonlyArray<{ method: string; pattern: RegExp }> = [
  { method: 'GET', pattern: /^\/drivers\/[^/]+\/vehicle$/ },
];

function isPublicRoute(method: string, path: string): boolean {
  if (PUBLIC_ROUTES.some((route) => route.method === method && route.path === path)) {
    return true;
  }
  return PUBLIC_PATTERNS.some((route) => route.method === method && route.pattern.test(path));
}

interface RolePolicy {
  method: string;
  pattern: RegExp;
  roles: Role[];
  /**
   * Regex capture group index holding the resource's own id (e.g. the
   * :driverId in /drivers/:id/status). When set, the token's `sub` must equal
   * that captured value — otherwise any driver could spoof another driver's
   * location or status, which role-only RBAC alone wouldn't catch (both are
   * "a driver", just not the *right* driver). 'operator' bypasses this, same
   * as it bypasses nothing else — it's meant to manage others' resources.
   * Not set for /trips/:id/* — the trip's owning rider/driver isn't known to
   * the gateway (would need a domain DB lookup it deliberately doesn't have,
   * see proxy.controller.ts); that gap is called out in threat-model.md.
   */
  ownIdGroup?: number;
}

// RBAC ("is this role allowed to call this route", as distinct from ADR-005's
// "is this token valid at all") — a route not listed here has no role
// restriction and is reachable by any authenticated role, same as before this
// existed.
const ROLE_POLICIES: readonly RolePolicy[] = [
  { method: 'GET', pattern: /^\/riders\/([^/]+)$/, roles: ['rider', 'operator'], ownIdGroup: 1 },
  { method: 'PATCH', pattern: /^\/riders\/([^/]+)$/, roles: ['rider', 'operator'], ownIdGroup: 1 },
  // No ownIdGroup: the :id here is the RIDER being looked up, not the caller
  // — a driver legitimately fetches a *different* person's contact details
  // once assigned to their trip. Same class of gap as /trips/:id/* below
  // (the gateway can't verify the driver is actually assigned to this
  // rider's trip without a domain DB lookup it deliberately doesn't have).
  { method: 'GET', pattern: /^\/riders\/([^/]+)\/contact$/, roles: ['driver', 'operator'] },
  { method: 'POST', pattern: /^\/rides$/, roles: ['rider', 'operator'] },
  { method: 'POST', pattern: /^\/rides\/[^/]+\/cancel$/, roles: ['rider', 'operator'] },
  { method: 'GET', pattern: /^\/drivers\/([^/]+)$/, roles: ['driver', 'operator'], ownIdGroup: 1 },
  // No ownIdGroup: the :id here is the DRIVER being looked up, not the
  // caller — a rider legitimately fetches a *different* person's contact
  // details once matched to their trip. Same class of gap as the riders
  // contact route above and /trips/:id/* below.
  { method: 'GET', pattern: /^\/drivers\/([^/]+)\/contact$/, roles: ['rider', 'operator'] },
  { method: 'PATCH', pattern: /^\/drivers\/([^/]+)\/status$/, roles: ['driver', 'operator'], ownIdGroup: 1 },
  { method: 'PATCH', pattern: /^\/drivers\/([^/]+)$/, roles: ['driver', 'operator'], ownIdGroup: 1 },
  { method: 'POST', pattern: /^\/drivers\/([^/]+)\/location$/, roles: ['driver', 'operator'], ownIdGroup: 1 },
  { method: 'GET', pattern: /^\/trips\/driver\/([^/]+)\/active$/, roles: ['driver', 'operator'], ownIdGroup: 1 },
  { method: 'GET', pattern: /^\/trips\/rider\/([^/]+)\/history$/, roles: ['rider', 'operator'], ownIdGroup: 1 },
  { method: 'GET', pattern: /^\/trips\/driver\/([^/]+)\/history$/, roles: ['driver', 'operator'], ownIdGroup: 1 },
  { method: 'GET', pattern: /^\/trips\/[^/]+$/, roles: ['rider', 'driver', 'operator'] },
  { method: 'POST', pattern: /^\/trips\/[^/]+\/(accept|decline|driver-arrived|start|complete)$/, roles: ['driver', 'operator'] },
  { method: 'POST', pattern: /^\/trips\/[^/]+\/cancel$/, roles: ['rider', 'driver', 'operator'] },
];

function findPolicy(method: string, path: string): { policy: RolePolicy; match: RegExpMatchArray } | undefined {
  for (const policy of ROLE_POLICIES) {
    if (policy.method !== method) continue;
    const match = path.match(policy.pattern);
    if (match) return { policy, match };
  }
  return undefined;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();

    if (req.path.startsWith('/health')) {
      return true;
    }

    // No configured route for this path: let ProxyController return its own
    // 404 rather than masking it behind a 401.
    if (!matchRoute(req.path, getProxyRoutes())) {
      return true;
    }

    if (isPublicRoute(req.method, req.path)) {
      return true;
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      req.user = await this.jwtService.verifyAsync<AuthenticatedUser>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const found = findPolicy(req.method, req.path);
    if (found) {
      const { policy, match } = found;
      if (!policy.roles.includes(req.user.role)) {
        throw new ForbiddenException(`Role '${req.user.role}' is not permitted to call this route`);
      }
      if (policy.ownIdGroup !== undefined && req.user.role !== 'operator' && match[policy.ownIdGroup] !== req.user.sub) {
        throw new ForbiddenException(`Cannot act on another ${req.user.role}'s resource`);
      }
    }

    return true;
  }
}
